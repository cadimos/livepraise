const {
    contextBridge,
    ipcRenderer
} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel) => {
            // whitelist channels
            ipcRenderer.send(channel);
        },
        removeAllListeners: (channel) =>{
        	ipcRenderer.removeAllListeners(channel);
        },
        receive: (channel, func) => {
            ipcRenderer.on(channel, (event, args) => func(args));
        },
        version:()=>{
			ipcRenderer.send('app_version');
		    ipcRenderer.on('app_version', (event, arg) => {
		      ipcRenderer.removeAllListeners('app_version');
		      return arg.version;
		    });
		},
		updateDisponivel: ()=>{
		    ipcRenderer.on('update_available', () => {
			  ipcRenderer.removeAllListeners('update_available');
			  return 'Uma nova Atualização Disponivel. Fazendo Download...';
			});
		},
		updateCompleto: ()=>{
			ipcRenderer.on('update_downloaded', () => {
			  ipcRenderer.removeAllListeners('update_downloaded');
			  return 'Atualização Baixada. Ela será instalada ao Reiniciar o aplicativo. Reiniciar Agora?';
			});
        }
    }
);