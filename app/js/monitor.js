$('#navegacao a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });
  var el = document.querySelector('.chrome-tabs')
  var chromeTabs = new ChromeTabs()

  chromeTabs.init(el, {
    tabOverlapDistance: 14,
    minWidth: 45,
    maxWidth: 243
  })

  el.addEventListener('activeTabChange', ({ detail }) => console.log('Active tab changed', detail.tabEl))
  el.addEventListener('tabAdd', ({ detail }) => console.log('Tab added', detail.tabEl))
  el.addEventListener('tabRemove', ({ detail }) => console.log('Tab removed', detail.tabEl))

  document.querySelector('button[data-add-tab]').addEventListener('click', function(){
    chromeTabs.addTab({
      title: 'New Tab',
      favicon: '../chrome-tabs/demo/images/default-favicon.png',
    })
  });

  document.querySelector('button[data-remove-tab]').addEventListener('click', function(){
    chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
  });

  document.querySelector('button[data-theme-toggle]').addEventListener('click', function(){
    if (el.classList.contains('chrome-tabs-dark-theme')) {
      document.documentElement.classList.remove('dark-theme')
      el.classList.remove('chrome-tabs-dark-theme')
    } else {
      document.documentElement.classList.add('dark-theme')
      el.classList.add('chrome-tabs-dark-theme')
    }
  })

function backgroundRapido(url){
    removeConteudo();
}
function removeConteudo(){

}
function viewVideo(url){

}
function viewYoutube(url){

}
function alerta(texto){

}