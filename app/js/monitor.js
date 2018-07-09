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
    $("#preview img").fadeOut(150, function() {
        $("#preview img").attr('src',url);
    }).fadeIn(200);
    var socket = io.connect("http://localhost:3000");
    var text = '{"funcao":[' +
'{"nome":"background","valor":"'+url+'" }]}';
    socket.emit("send", text);
    setTimeout(() => removeConteudo(), 200)
}
function removeConteudo(){
  $('.texto').html('');
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
'{"nome":"removeConteudo","valor":"remove" }]}';
    socket.emit("send", text);
}
function viewVideo(url){

}
function viewYoutube(url){

}
function alerta(texto){

}
function texto(id){
  txt=$('#'+id).html();
  var n = Number(txt.split('<br>').length);
  font=Number(1.7);
  if(n>font){
    tamanho = (font-(font/n));
    console.log(tamanho);
  }else{
    tamanho = font;
  }
  $('.texto').css('font-size',tamanho+'em');
  $('.texto').css('text-align','center');
  $('.texto').html(txt);
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
}