import { BrowserWindow, screen, type Display } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyChromiumUserAgent } from '../chromium-user-agent.js';
import { resolveAppIcon } from '../app-icon.js';
import type { DisplayAssignment, DisplaysConfig } from './types.js';
import { loadOrCreateConfig, saveAssignments } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DisplayManagerOptions {
  serverPort: number;
  preloadPath: string;
  appRoot: string;
  /** Fechar a janela do operador encerra todo o sistema (CAD-101). */
  onOperatorClosed?: () => void;
}

export class DisplayManager {
  private readonly windows = new Map<string, BrowserWindow>();
  private config: DisplaysConfig;
  private shuttingDown = false;
  private hotplugAttached = false;
  private readonly appIcon: string | undefined;

  constructor(private readonly options: DisplayManagerOptions) {
    this.config = loadOrCreateConfig();
    this.appIcon = resolveAppIcon(options.appRoot);
  }

  getConfig(): DisplaysConfig {
    return this.config;
  }

  listForSplash(): Array<{ label: string; role: string; primary: boolean }> {
    return this.config.assignments.map((a) => ({
      label: a.label,
      role: a.role,
      primary: a.primary,
    }));
  }

  async openAll(): Promise<void> {
    this.syncWithSystemDisplays();
    await this.waitForOperatorWindow();
    this.ensureOperatorVisible();
  }

  /** Escuta ligação/desligação de monitores e abre/fecha janelas sem reiniciar (CAD-175). */
  attachHotplugListeners(): void {
    if (this.hotplugAttached) return;
    this.hotplugAttached = true;
    screen.on('display-added', this.onDisplayChanged);
    screen.on('display-removed', this.onDisplayChanged);
    screen.on('display-metrics-changed', this.onDisplayChanged);
  }

  detachHotplugListeners(): void {
    if (!this.hotplugAttached) return;
    this.hotplugAttached = false;
    screen.off('display-added', this.onDisplayChanged);
    screen.off('display-removed', this.onDisplayChanged);
    screen.off('display-metrics-changed', this.onDisplayChanged);
  }

  private readonly onDisplayChanged = (): void => {
    this.syncWithSystemDisplays();
  };

  closeAll(): void {
    this.shuttingDown = true;
    this.detachHotplugListeners();
    for (const win of this.windows.values()) {
      if (!win.isDestroyed()) win.close();
    }
    this.windows.clear();
  }

  reloadFromDisk(): void {
    this.config = loadOrCreateConfig();
  }

  private syncWithSystemDisplays(): void {
    if (this.shuttingDown) return;

    const before = JSON.stringify(this.config.assignments);
    this.reloadFromDisk();
    const connectedIds = new Set(screen.getAllDisplays().map((d) => d.id));

    for (const [key, win] of [...this.windows.entries()]) {
      const displayId = Number(key);
      if (!connectedIds.has(displayId)) {
        if (!win.isDestroyed()) win.close();
        this.windows.delete(key);
      }
    }

    for (const assignment of this.config.assignments) {
      if (assignment.role === 'off') continue;
      if (!connectedIds.has(assignment.displayId)) continue;
      this.openWindow(assignment);
      this.repositionWindow(assignment);
    }

    const openedOperator = this.findOperatorWindow();
    if (!openedOperator) {
      console.warn(
        '[livepraise] Nenhum monitor ligado com papel «operador». ' +
          'Ligue o monitor principal ou redefina os papéis em Configurações → Tela projetor.',
      );
    }

    if (JSON.stringify(this.config.assignments) !== before) {
      this.config = saveAssignments(this.config.assignments);
    }
  }

  private repositionWindow(assignment: DisplayAssignment): void {
    const win = this.windows.get(String(assignment.displayId));
    if (!win || win.isDestroyed()) return;
    const { x, y, width, height } = assignment.bounds;
    win.setBounds({ x, y, width, height });
  }

  private urlForRole(assignment: DisplayAssignment): string {
    const base = `http://127.0.0.1:${this.options.serverPort}`;
    const { width, height } = assignment.bounds;
    const displayQuery = `displayId=${assignment.displayId}&vw=${width}&vh=${height}`;
    switch (assignment.role) {
      case 'operator':
        return `${base}/operator/`;
      case 'projection':
        return `${base}/projector/?${displayQuery}`;
      case 'stage-return':
        return `${base}/stage/?${displayQuery}`;
      default:
        return base;
    }
  }

  private openWindow(assignment: DisplayAssignment): void {
    const key = String(assignment.displayId);
    if (this.windows.has(key)) return;

    const { x, y, width, height } = assignment.bounds;
    const frame = assignment.role === 'operator';
    const fullscreen = !frame && assignment.role !== 'operator';

    const win = new BrowserWindow({
      x,
      y,
      width,
      height,
      show: false,
      frame,
      fullscreen,
      title:
        assignment.role === 'operator'
          ? 'Live Praise — Operador'
          : assignment.role === 'stage-return'
            ? 'Live Praise — Retorno'
            : 'Live Praise — Projetor',
      backgroundColor: '#000',
      ...(this.appIcon ? { icon: this.appIcon } : {}),
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    applyChromiumUserAgent(win.webContents);
    win.setMenuBarVisibility(false);
    void win.loadURL(this.urlForRole(assignment));

    this.attachWindowReveal(win, assignment);

    win.on('closed', () => {
      this.windows.delete(key);
      if (
        assignment.role === 'operator' &&
        !this.shuttingDown &&
        this.options.onOperatorClosed
      ) {
        this.options.onOperatorClosed();
      }
    });

    this.windows.set(key, win);
  }

  /** Garante que a janela fica visível mesmo se `ready-to-show` não disparar (ex.: falha parcial de GPU). */
  private attachWindowReveal(
    win: BrowserWindow,
    assignment: DisplayAssignment,
  ): void {
    let revealed = false;
    const reveal = (reason: string): void => {
      if (revealed || win.isDestroyed()) return;
      revealed = true;
      if (assignment.role === 'operator') {
        console.info(`[livepraise] A mostrar janela do operador (${reason}).`);
      }
      win.webContents.zoomFactor = 1;
      win.show();
      if (assignment.role === 'operator') {
        if (!win.isMaximized()) win.maximize();
        win.moveTop();
        win.focus();
      }
    };

    win.once('ready-to-show', () => reveal('ready-to-show'));
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => reveal('did-finish-load'), 0);
    });
    win.webContents.once('did-fail-load', (_event, code, desc, url) => {
      console.error(`[livepraise] Falha ao carregar ${url}: ${code} ${desc}`);
      reveal('did-fail-load');
    });
    setTimeout(() => reveal('timeout'), 4_000);
  }

  ensureOperatorVisible(): void {
    const win = this.findOperatorWindow();
    if (!win || win.isDestroyed()) return;
    win.webContents.zoomFactor = 1;
    if (!win.isVisible()) win.show();
    if (!win.isMaximized()) win.maximize();
    win.moveTop();
    win.focus();
  }

  private findOperatorWindow(): BrowserWindow | undefined {
    for (const [key, win] of this.windows.entries()) {
      if (win.isDestroyed()) continue;
      const assignment = this.config.assignments.find(
        (a) => String(a.displayId) === key,
      );
      if (assignment?.role === 'operator') return win;
    }
    return undefined;
  }

  private waitForOperatorWindow(maxMs = 12_000): Promise<void> {
    return new Promise((resolve) => {
      const deadline = Date.now() + maxMs;

      const poll = (): void => {
        const operator = this.findOperatorWindow();
        if (operator?.isVisible()) {
          resolve();
          return;
        }

        if (Date.now() > deadline) {
          console.warn(
            '[livepraise] Tempo esgotado aguardando janela do operador; a forçar exibição.',
          );
          this.ensureOperatorVisible();
          resolve();
          return;
        }

        setTimeout(poll, 100);
      };

      poll();
    });
  }
}

export function summarizeDisplays(displays: Display[]): string[] {
  return displays.map(
    (d, i) =>
      `${d.label || `Monitor ${i + 1}`} ${d.bounds.width}×${d.bounds.height}`,
  );
}
