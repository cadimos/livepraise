import { contextBridge, ipcRenderer } from 'electron';

export type UpdateStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; percent?: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; message: string; fallback: true };

contextBridge.exposeInMainWorld('livepraise', {
  version: '1.0.0-alpha.3',
  runtime: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  onDisplays(callback: (displays: unknown) => void) {
    ipcRenderer.on('livepraise:displays', (_event, payload) => {
      callback(payload);
    });
  },
  getDisplaysConfig: () => ipcRenderer.invoke('livepraise:get-displays-config'),
  onUpdateStatus(callback: (status: UpdateStatus) => void) {
    ipcRenderer.on('livepraise:update-status', (_event, status: UpdateStatus) => {
      callback(status);
    });
  },
  checkForUpdates: () => ipcRenderer.invoke('livepraise:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('livepraise:install-update'),
});
