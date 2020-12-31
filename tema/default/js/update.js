const version = document.getElementById('version');
const message = document.getElementById('message');
const not = document.getElementById('notification');
const restartButton = document.getElementById('restart-button');
versao=window.api.version();
disponivel=window.api.updateDisponivel();
completo=window.api.updateCompleto();
if(versao){
  version.innerText = 'Versão ' + versao;
}
if(disponivel){
  message.innerText = disponivel;
  restartButton.classList.remove('hidden');
  not.classList.remove('hidden');
}
if(completo){
  message.innerText = completo;
  restartButton.classList.remove('hidden');
  not.classList.remove('hidden');
}
function closeNotification() {
  not.classList.add('hidden');
}
function restartApp() {
  window.api.send('restart_app');
}
