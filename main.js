//Inicio o Electon
const electron = require('electron');
//Importo os modulos
const { app, BrowserWindow } = require('electron');
//Inicio a aplicação
app.on('ready', function() {
    //Pego a altura e largura do monitor principal
    const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
    //Crio minha janela no monitor principal
    let win = new BrowserWindow({ x: 0, y: 0, width, height });
    //Abro a URL do monitor
    win.loadURL('file://' + __dirname + '/index.html');
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
            frame: false
        });
        //Abro a url do monitor externo
        win2.loadURL('https://github.com');
    }
    //Ação ao fechar o monitor principal
    win.on('closed', () => {
        win = null,
            win2.close()
    });
});