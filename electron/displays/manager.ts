import { BrowserWindow, type Display } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DisplayAssignment, DisplaysConfig } from './types.js';
import { loadOrCreateConfig } from './config.js';

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
    for (const assignment of this.config.assignments) {
      if (assignment.role === 'off') continue;
      this.openWindow(assignment);
    }
  }

  closeAll(): void {
    this.shuttingDown = true;
    for (const win of this.windows.values()) {
      if (!win.isDestroyed()) win.close();
    }
    this.windows.clear();
  }

  reloadFromDisk(): void {
    this.config = loadOrCreateConfig();
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
