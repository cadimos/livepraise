//Inicio o Electon
const electron = require('electron');
//Importo os modulos
//  deepcode ignore JavascriptDuplicateImport: necessário para iniciação
const { app, BrowserWindow, powerSaveBlocker, Menu } = require('electron');
const id_power_monitor = powerSaveBlocker.start('prevent-display-sleep');
const config = require('./config');

//Inicio a aplicação
app.allowRendererProcessReuse=true;
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
        title: 'Live Praise - Iniciando',
        icon: __dirname+'/app/icon/livepraise.png',
        backgroundColor: '#000',
    });
    splash.loadURL('file://' + __dirname + '/app/splash.html');
    //Crio minha janela no monitor principal
    let win = new BrowserWindow({
        x: 0,
        y: 0,
        width,
        height,
        show: false,
        title: 'Live Praise - Projeção',
        icon: __dirname+'/app/icon/livepraise.png',
    });
    const server = require("./server");
    //Abro a URL do monitor
    win.setMenuBarVisibility(false);
    win.loadURL('file://' + __dirname + '/tema/'+config.tema+'/index.html');
    win.openDevTools();
    win.once('ready-to-show',()=>{
        win.show();
        splash.close();
    })
    win.webContents.on('new-window', (event, url) => {
        event.preventDefault()
        const win_link = new BrowserWindow({
            title: 'Live Praise',
            icon: __dirname+'/app/icon/livepraise.png',
            show: false
            })
        win_link.once('ready-to-show', () => win_link.show())
        win_link.loadURL(url)
        win_link.setMenuBarVisibility(false);
        event.newGuest = win_link
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
            title: 'Live Praise - Projetor',
            icon: __dirname+'/app/icon/livepraise.png'
        });
        //Abro a url do monitor externo
        win2.loadURL('file://' + __dirname + '/tema/'+config.tema+'/projetor.html');
        win2.openDevTools();
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
