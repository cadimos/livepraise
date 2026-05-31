import { BrowserWindow, screen, type Display } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyChromiumUserAgent } from '../chromium-user-agent.js';
import type { DisplayAssignment, DisplaysConfig } from './types.js';
import { loadOrCreateConfig, saveAssignments } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DisplayManagerOptions {
  serverPort: number;
  preloadPath: string;
  /** Fechar a janela do operador encerra todo o sistema (CAD-101). */
  onOperatorClosed?: () => void;
}

export class DisplayManager {
  private readonly windows = new Map<string, BrowserWindow>();
  private config: DisplaysConfig;
  private shuttingDown = false;
  private hotplugAttached = false;

  constructor(private readonly options: DisplayManagerOptions) {
    this.config = loadOrCreateConfig();
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
    const displayQuery = `displayId=${assignment.displayId}`;
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
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    applyChromiumUserAgent(win.webContents);
    win.setMenuBarVisibility(false);
    void win.loadURL(this.urlForRole(assignment));

    win.once('ready-to-show', () => {
      if (assignment.role === 'operator') {
        win.maximize();
      }
      win.show();
    });

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
}

export function summarizeDisplays(displays: Display[]): string[] {
  return displays.map(
    (d, i) =>
      `${d.label || `Monitor ${i + 1}`} ${d.bounds.width}×${d.bounds.height}`,
  );
}
