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
  if(document.querySelector('button[data-add-tab]')){
    document.querySelector('button[data-add-tab]').addEventListener('click', function(){
      chromeTabs.addTab({
        title: 'New Tab',
        favicon: '../chrome-tabs/demo/images/default-favicon.png',
      })
    });
  }
  if(document.querySelector('button[data-remove-tab]')){
    document.querySelector('button[data-remove-tab]').addEventListener('click', function(){
      chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
    });
  }

  if(document.querySelector('button[data-theme-toggle]')){
    document.querySelector('button[data-theme-toggle]').addEventListener('click', function(){
      if (el.classList.contains('chrome-tabs-dark-theme')) {
        document.documentElement.classList.remove('dark-theme')
        el.classList.remove('chrome-tabs-dark-theme')
      } else {
        document.documentElement.classList.add('dark-theme')
        el.classList.add('chrome-tabs-dark-theme')
      }
    })
  }


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
  $('.texto span').html(txt);
  $('.texto').textfill({
    maxFontPixels: 0
  });
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
}

const fs = require('fs');
function getFiles (dir, files_){
    if(dir==null || dir=='' || dir=='undefined'){
        dir='app/Dados/imagens';
    }
    console.log(dir);
    files_ = files_ || [];
    var files = fs.readdirSync(dir);
    for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
            getFiles(name, files_);
        } else {
            name=name.replace('app/','');
            files_.push(name);
        }
    }
    return files_;
}

  console.log(getFiles())
