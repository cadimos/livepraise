import { app, BrowserWindow, ipcMain, screen } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DisplayManager } from './displays/manager.js';
import { loadOrCreateConfig } from './displays/config.js';
import { setupAutoUpdater } from './updater.js';
import { resolveAppIcon } from './app-icon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PORT = Number(process.env.LIVEPRAISE_PORT ?? process.env.APP_PORT ?? 3000);
const SERVER_WAIT_MS = Number(process.env.LIVEPRAISE_SERVER_WAIT_MS ?? 60_000);
const APP_ROOT = app.isPackaged ? app.getAppPath() : process.cwd();
const APP_ICON = resolveAppIcon(APP_ROOT);

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
    cwd: APP_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      LIVEPRAISE_PORT: String(SERVER_PORT),
      LIVEPRAISE_APP_ROOT: APP_ROOT,
    },
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`Servidor Livepraise encerrou com código ${code}`);
    }
    serverProcess = null;
  });
}

async function isCad194ServerReady(): Promise<boolean> {
  const healthRes = await fetch(`http://127.0.0.1:${SERVER_PORT}/health`);
  if (!healthRes.ok) return false;
  const health = (await healthRes.json()) as { features?: { cad194?: boolean } };
  if (health.features?.cad194 !== true) return false;

  const pingRes = await fetch(`http://127.0.0.1:${SERVER_PORT}/video/importar/ping`);
  if (!pingRes.ok) return false;
  const ping = (await pingRes.json()) as { cad194?: boolean };
  return ping.cad194 === true;
}

async function waitForServer(maxMs = SERVER_WAIT_MS): Promise<void> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    try {
      if (await isCad194ServerReady()) return;
    } catch {
      // servidor ainda a subir
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Servidor CAD-194 indisponível em ${maxMs}ms (porta ${SERVER_PORT}). ` +
      'Execute npm run build com Node 22+, encerre processos antigos na porta e use npm run dev.',
  );
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
    ...(APP_ICON ? { icon: APP_ICON } : {}),
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
    appRoot: APP_ROOT,
    onOperatorClosed: shutdownLivepraise,
  });

  await displayManager.openAll();
  displayManager.attachHotplugListeners();
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
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
    serverProcess = null;
    splashWindow?.close();
    splashWindow = null;
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
