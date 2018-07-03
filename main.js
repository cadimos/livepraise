//Inicio o Electon
const electron = require('electron');
//Importo os modulos
const { app, BrowserWindow } = require('electron');
const server = require("./server");

//Inicio a aplicação
app.on('ready', function() {
    //Pego a altura e largura do monitor principal
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    //defino o Menu
    const menu = null;
    //Crio minha janela no monitor principal
    let win = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        webPreferences: {
            preload: './preload.js'
        }
    });
    //seto o menu
    win.setMenu(menu);
    //Abro a URL do monitor
    win.loadURL('file://' + __dirname + '/public/index.html');
    //win.loadURL('file://' + __dirname + '/chrome-tabs/index.html');
    //win.loadURL('https://adamschwartz.co/chrome-tabs/');
    win.openDevTools();
    //Capturo os monitores disponiveis
    let displays = electron.screen.getAllDisplays();
    //Verifico sem tem um monitor externo
    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    });
    //Abro o Monitor externo
    if (externalDisplay) {
        win2 = new BrowserWindow({
            x: externalDisplay.bounds.x,
            y: externalDisplay.bounds.y,
            width: externalDisplay.bounds.width,
            height: externalDisplay.bounds.height,
            frame: false,
        });
        //Abro a url do monitor externo
        win2.loadURL('file://' + __dirname + '/public/projetor.html');
        //win2.loadURL('http://localhost:8080/index.html');
        //win2.loadURL('http://localhost:8080/projetor.html');
        //win2.loadURL('http://localhost:8080/index.html');
        //win2.openDevTools();
        win2.on('closed', () => {
            app.quit()
        });
    }
    //Ação ao fechar
    win.on('closed', () => {
        app.quit()
    });
});