import { createRequire } from 'node:module';
import { app, BrowserWindow, Notification, ipcMain } from 'electron';

const require = createRequire(import.meta.url);

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; percent?: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string; fallback: true };

type AutoUpdaterModule = typeof import('electron-updater');

let autoUpdater: AutoUpdaterModule['autoUpdater'] | null = null;

function loadAutoUpdater(): AutoUpdaterModule['autoUpdater'] | null {
  try {
    const mod = require('electron-updater') as AutoUpdaterModule;
    return mod.autoUpdater ?? null;
  } catch (err) {
    console.warn(
      '[livepraise-updater] electron-updater indisponível:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function broadcast(status: UpdateStatus): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('livepraise:update-status', status);
    }
  }
}

function notifyUser(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return;
  }
  console.warn(`[livepraise-updater] ${title}: ${body}`);
}

/**
 * Auto-update em segundo plano (CA-R03). Em falha de download/instalação silenciosa,
 * notifica o utilizador para instalar manualmente (fallback).
 */
export async function setupAutoUpdater(): Promise<void> {
  if (!app.isPackaged) return;

  autoUpdater = loadAutoUpdater();
  if (!autoUpdater) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    broadcast({ kind: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    const version = info.version ?? 'nova versão';
    broadcast({ kind: 'available', version });
    notifyUser(
      'Live Praise',
      `Atualização ${version} disponível — download em segundo plano.`,
    );
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcast({
      kind: 'downloading',
      percent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const version = info.version ?? 'nova versão';
    broadcast({ kind: 'ready', version });
    notifyUser(
      'Live Praise',
      `Atualização ${version} pronta. Será aplicada ao encerrar o app, ou use "Instalar agora".`,
    );
  });

  autoUpdater.on('error', (err) => {
    const message =
      err instanceof Error ? err.message : String(err ?? 'erro desconhecido');
    broadcast({ kind: 'error', message, fallback: true });
    notifyUser(
      'Live Praise',
      `Não foi possível atualizar automaticamente: ${message}. Verifique releases em GitHub.`,
    );
  });

  ipcMain.handle('livepraise:install-update', async () => {
    if (!autoUpdater) return { ok: false, reason: 'updater-not-active' };
    autoUpdater.quitAndInstall(false, true);
    return { ok: true };
  });

  ipcMain.handle('livepraise:check-for-updates', async () => {
    if (!autoUpdater) return { ok: false, reason: 'dev-mode' };
    await autoUpdater.checkForUpdates();
    return { ok: true };
  });

  void autoUpdater.checkForUpdatesAndNotify();
}
