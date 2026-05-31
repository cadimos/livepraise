import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DisplayManager } from './displays/manager.js';
import { loadOrCreateConfig } from './displays/config.js';
import { setupAutoUpdater } from './updater.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = Number(process.env.LIVEPRAISE_PORT ?? process.env.APP_PORT ?? 3000);

let splashWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let displayManager: DisplayManager | null = null;
let shuttingDown = false;

function shutdownLivepraise(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  displayManager?.closeAll();
  displayManager = null;
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  serverProcess = null;
  app.quit();
}

function startServerProcess(): void {
  const serverEntry = path.join(__dirname, '..', 'server', 'index.js');
  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, LIVEPRAISE_PORT: String(SERVER_PORT) },
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Servidor Livepraise encerrou com código ${code}`);
    }
    serverProcess = null;
  });
}

async function waitForServer(maxMs = 15000): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/health`);
      if (res.ok) return;
    } catch {
      // servidor ainda a subir
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Servidor não respondeu em ${maxMs}ms (porta ${SERVER_PORT})`);
}

function createSplashWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const win = new BrowserWindow({
    x,
    y,
    width: Math.min(520, width),
    height: Math.min(420, height),
    center: true,
    frame: false,
    resizable: false,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const splashPath = path.join(process.cwd(), 'electron', 'splash', 'splash.html');
  void win.loadFile(splashPath);

  win.once('ready-to-show', () => {
    win.show();
    const config = loadOrCreateConfig();
    win.webContents.send('livepraise:displays', config.assignments);
  });

  win.on('closed', () => {
    splashWindow = null;
  });

  return win;
}

async function launchWorkspace(): Promise<void> {
  const preloadPath = path.join(__dirname, 'preload.js');
  displayManager = new DisplayManager({
    serverPort: SERVER_PORT,
    preloadPath,
    onOperatorClosed: shutdownLivepraise,
  });

  await displayManager.openAll();
  splashWindow?.close();
  splashWindow = null;
}

app.whenReady().then(async () => {
  void setupAutoUpdater();
  startServerProcess();
  splashWindow = createSplashWindow();

  try {
    await waitForServer();
    await launchWorkspace();
  } catch (err) {
    console.error('Falha ao iniciar Livepraise:', err);
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      splashWindow = createSplashWindow();
      await waitForServer();
      await launchWorkspace();
    }
  });
});

ipcMain.handle('livepraise:get-displays-config', () => {
  return loadOrCreateConfig();
});

app.on('window-all-closed', () => {
  if (shuttingDown) return;
  shutdownLivepraise();
});
