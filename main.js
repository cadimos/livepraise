//Inicio o Electon
const electron = require('electron');
//Importo os modulos
const { app, BrowserWindow } = require('electron');
//Inicio a aplicação
app.on('ready', function() {
    //Pego a altura e largura do monitor principal
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    var xcenter=(width/2)-200;
    var ycenter=(height/2)-100;
    //Crio a tela de Splash
    let splash = new BrowserWindow({
        width:400,
        height:200,
        x: xcenter,
        y: ycenter,
        frame: false,
    });
    splash.loadURL('file://' + __dirname + '/app/splash.html');
    const server = require("./server");
    //defino o Menu
    const menu = null;
    //Crio minha janela no monitor principal
    let win = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        show: false,
        webPreferences: {
            preload: './preload.js'
        }
    });
    //seto o menu
    win.setMenu(menu);
    //Abro a URL do monitor
    win.loadURL('file://' + __dirname + '/app/index.html');
    //win.openDevTools();
    win.once('ready-to-show',()=>{
        win.show();
        splash.close();
    })
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
            show: false,
            frame: false,
        });
        //Abro a url do monitor externo
        win2.loadURL('file://' + __dirname + '/app/projetor.html');
        //win2.openDevTools();
        win2.once('ready-to-show',()=>{
            win2.show();
        })
        win2.on('closed', () => {
            app.quit()
        });

    }
    
    //Ação ao fechar
    win.on('closed', () => {
        app.quit()
    });
});