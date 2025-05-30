//Inicio o Electon
const electron = require('electron');
//Importo os modulos
//  deepcode ignore JavascriptDuplicateImport: necessário para iniciação
const { app, BrowserWindow, powerSaveBlocker, Menu, ipcMain, dialog } = require('electron');
//require('update-electron-app')();
const { autoUpdater } = require('electron-updater');
const id_power_monitor = powerSaveBlocker.start('prevent-display-sleep');
const path = require("path");
const config = require('../backend/config');
const fs = require('graceful-fs');
const fse = require('fs-extra');

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error);
    dialog.showErrorBox(
        'Erro Inesperado',
        'Ocorreu um erro inesperado. O aplicativo será reiniciado.'
    );
    app.relaunch();
    app.exit(0);
});

//Pagina de iniciação
async function splash() {
  const { width: screenWidth, height: screenHeight } = electron.screen.getPrimaryDisplay().workAreaSize;
  const { width, height } = config.electron.splashScreen;
  const xcenter = (screenWidth / 2) - (width / 2);
  const ycenter = (screenHeight / 2) - (height / 2);

  const splash = new BrowserWindow({
    width,
    height,
    x: xcenter,
    y: ycenter,
    frame: false,
    title: 'Live Praise - Iniciando',
    icon: path.join(__dirname, '../frontend/assets/icon/livepraise.png'),
    backgroundColor: '#000',
  });

  splash.loadURL('file://' + path.join(__dirname, '../frontend/assets/tema', config.tema, 'splash.html'));
  return splash;
}

async function monitorPrincipal() {
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  const { minWidth, minHeight } = config.electron.mainWindow;

  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    minWidth,
    minHeight,
    show: false,
    title: 'Live Praise - Projeção',
    icon: path.join(__dirname, '../frontend/assets/icon/livepraise.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Feedback de carregamento
  win.webContents.on('did-start-loading', () => {
    win.webContents.send('loading-started');
  });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('loading-finished');
  });

  // Tratamento de erros de rede
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    dialog.showErrorBox(
      'Erro de Conexão',
      `Não foi possível conectar ao servidor. Erro: ${errorDescription}`
    );
  });

  win.loadURL(`http://${config.server.host}:${config.server.port}`);
  win.setMenuBarVisibility(false);

  win.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    const win_link = new BrowserWindow({
      title: 'Live Praise',
      icon: path.join(__dirname, '../frontend/assets/icon/livepraise.png'),
      show: false,
    });
    win_link.once('ready-to-show', () => win_link.show());
    win_link.loadURL(url);
    win_link.setMenuBarVisibility(false);
    event.newGuest = win_link;
  });

  win.once('ready-to-show', () => {
    win.show();
    // Verificar atualizações
    if (config.env === 'production') {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  win.on('closed', () => {
    app.quit();
  });

  return true;
}

async function checkArquivos() {
  const fileBD = config.database.path;
  if (!fs.existsSync(fileBD)) {
    console.log('Não existe o dados iniciais');
    try {
      await fse.copy(
        path.join(__dirname, '../install/livepraise'),
        path.dirname(fileBD)
      );
      console.log('Copiado com sucesso');
    } catch (err) {
      console.error('Erro ao copiar arquivos iniciais:', err);
      dialog.showErrorBox(
        'Erro de Instalação',
        'Não foi possível copiar os arquivos iniciais. Por favor, reinstale o aplicativo.'
      );
      app.quit();
    }
  }
  return true;
}

async function openMonitor(item) {
  if (item.bounds.x !== 0) {
    console.log(`Criando Janela: ${item.id}`);
    item.id = new BrowserWindow({
      x: item.bounds.x,
      y: item.bounds.y,
      width: item.bounds.width,
      height: item.bounds.height,
      show: false,
      frame: false,
      title: 'Live Praise - Projetor',
      icon: path.join(__dirname, '../frontend/assets/icon/livepraise.png')
    });

    console.log(`Iniciando a URL: http://${config.server.host}:${config.server.port}/projetor.html`);
    item.id.loadURL(`http://${config.server.host}:${config.server.port}/projetor.html`);

    console.log('Verificando se monitor está pronto');
    item.id.once('ready-to-show', () => {
      console.log('Exibindo monitor');
      item.id.show();
    });

    item.id.on('closed', () => {
      app.quit();
    });
  }
  return true;
}

async function monitores() {
  console.log('Identificando Monitores....');
  const displays = electron.screen.getAllDisplays();
  console.log('Abrindo Monitores....');
  console.log(displays);
  displays.forEach(openMonitor);
}

//Inicio a aplicação
app.allowRendererProcessReuse = true;
app.on('ready', async function () {
  console.log('Iniciando....');
  const intro = await splash();
  console.log('Verificando Arquivos....');
  await checkArquivos();
  console.log('Iniciando Servidor HTTP e Websocket....');
  const server = require("../backend/server");
  await new Promise(r => setTimeout(r, 800));
  console.log('Identificando Monitor Principal....');
  const monitor = await monitorPrincipal();
  if (monitor) {
    console.log('Fechando Intro....');
    intro.close();
  }
  console.log('Iniciando Monitores....');
  await monitores();
});
/*
if(app.getName()=='Electron'){
    var packageJsonInfo = require('./package.json');
    versao=packageJsonInfo.version;
}else{
    versao=app.getVersion();
}
*/
/*
ipcMain.on('app_version', (event) => {
  event.sender.send('app_version', { version: versao });
});
autoUpdater.on('update-available', () => {
  win.webContents.send('update_available');
});
autoUpdater.on('update-downloaded', () => {
  win.webContents.send('update_downloaded');
});
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});
*/