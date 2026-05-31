//Inicio o Electon
const electron = require('electron');
//Importo os modulos
//  deepcode ignore JavascriptDuplicateImport: necessário para iniciação
const { app, BrowserWindow, powerSaveBlocker, Menu, ipcMain } = require('electron');
//require('update-electron-app')();
const { autoUpdater } = require('electron-updater');
const id_power_monitor = powerSaveBlocker.start('prevent-display-sleep');
const path = require("path");
const config = require('./config');
const fs = require('graceful-fs');
const fse = require('fs-extra');

//Pagina de iniciação
async function splash() {
  let largura = 400;
  let altura = 200;
  //Pego a altura e largura do monitor principal
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  let xcenter = (width / 2) - (largura / 2);
  let ycenter = (height / 2) - (altura / 2);
  //Crio a tela de Splash
  let splash = new BrowserWindow({
    width: 400,
    height: 200,
    x: xcenter,
    y: ycenter,
    frame: false,
    title: 'Live Praise - Iniciando',
    icon: __dirname + '/assets/icon/livepraise.png',
    backgroundColor: '#000',
  });
  splash.loadURL('file://' + __dirname + '/tema/' + config.tema + '/splash.html');
  return splash;
}
async function monitorPrincipal() {
  //Pego a altura e largura do monitor principal
  const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
  //Crio minha janela no monitor principal
  //let windows = ["worker", "ui"];
  //Abro a URL do monitor
  let win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    show: false,
    title: 'Live Praise - Projeção',
    icon: __dirname + '/assets/icon/livepraise.png',
    webPreferences: {
      nodeIntegration: false, // is default value after Electron v5
      contextIsolation: true, // protect against prototype pollution
      enableRemoteModule: false, // turn off remote
      preload: path.join(__dirname, 'preload.js') // use a preload script
    }
  });
  win.loadURL(`http://localhost:${config.port}`);
  win.setMenuBarVisibility(false);
  win.webContents.on('new-window', (event, url) => {
    event.preventDefault()
    const win_link = new BrowserWindow({
      title: 'Live Praise',
      icon: __dirname + '/assets/icon/livepraise.png',
      show: false,
    })
    win_link.once('ready-to-show', () => win_link.show())
    win_link.loadURL(url)
    win_link.setMenuBarVisibility(false);
    event.newGuest = win_link
  })
  //win.openDevTools();
  win.once('ready-to-show', () => {
    //autoUpdater.checkForUpdatesAndNotify();
    win.show();
  })
  win.on('closed', () => {
    app.quit()
  });
  /*
win.openDevTools();

win.once('ready-to-show',()=>{
  //autoUpdater.checkForUpdatesAndNotify();
  win.show();
})
win.on('closed', () => {
  app.quit()
});
*/
  return true;
}
async function checkArquivos() {
  const fileBD = config.homedir + '/livepraise/dsw.bd';
  if (fs.existsSync(fileBD) === false) {
    console.log('Nao existe o dados iniciais');
    //Crio o BD, caso não exista
    try {
      await fse.copy(`${__dirname}/install/livepraise`, `${config.homedir}/livepraise`);
      console.log('Copiado com sucesso')
    } catch (err) {
      console.error(err)
    }
  }
  return true;
}
async function openMonitor(item, index) {
  if (item.bounds.x != 0) {
    console.log(`Criando Janela: ${item.id}`);
    item.id = new BrowserWindow({
      x: item.bounds.x,
      y: item.bounds.y,
      width: item.bounds.width,
      height: item.bounds.height,
      show: false,
      frame: false,
      title: 'Live Praise - Projetor',
      icon: __dirname + '/assets/icon/livepraise.png'
    });
    console.log(`Iniciando a URL: http://localhost:${config.port}/projetor.html`);
    item.id.loadURL(`http://localhost:${config.port}/projetor.html`);
    console.log('Verificando se monitor está pronto');
    item.id.once('ready-to-show', () => {
      console.log('Exibindo monitor');
      item.id.show();
    })
    //item.id.openDevTools();
    item.id.on('closed', () => {
      app.quit()
    });
  }
  return true;
}
async function monitores() {
  console.log('Identificando Monitores....');
  let displays = electron.screen.getAllDisplays();
  console.log('Abrindo Monitores....');
  displays.forEach(openMonitor)
}
//Inicio a aplicação
app.allowRendererProcessReuse = true;
app.on('ready', async function () {
  console.log('Iniciando....');
  let intro = await splash();
  console.log('Verificando Arquivos....');
  //await checkArquivos();
  console.log('Iniciando Servidor HTTP e Websocket....');
  const server = require("./server");
  await new Promise(r => setTimeout(r, 800));
  console.log('Identificando Monitor Principal....');
  let monitor = await monitorPrincipal();
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