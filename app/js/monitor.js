const fs = require('fs');
const exec = require('child-process-promise').exec;

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

function background(url){
  $('#video').css('display','none');
  $('#preview img').css('display','block');
  $("#preview img").fadeOut(150, function() {
    $("#preview img").attr('src',url);
}).fadeIn(200);
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
  '{"nome":"background","valor":"'+url+'" }]}';
  socket.emit("send", text);
}
function backgroundRapido(url){
    $('#video').css('display','none');
    $('#preview img').css('display','block');
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
  $('.texto span').html('');
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
'{"nome":"removeConteudo","valor":"remove" }]}';
    socket.emit("send", text);
}
function texto(id){
  txt=$('#'+id).html();
  $('.texto span').html(txt);
  $('.texto').textfill({
    maxFontPixels: 0
  });
  $('.texto').css('text-align','center');
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
}


function catImagens(){
  $('#cat_imagens').html();
  dir='app/Dados/imagens';
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      vl=name;
      option=name.replace(dir+'/','');
      $('#cat_imagens').append('<option value="'+vl+'">'+option+'</option>');
      if(i==0){
        lista_imagem(vl);
      }
    }else{
      //é um arquivo
    }
  }
}
catImagens();
function lista_imagem(dir){
  $('#preview-imagens').html('');
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      //É um diretorio
    }else{
      img=name.replace('app/','');
      $('#preview-imagens').append('<li><img src="'+img+'" onclick="background(\''+img+'\')"></li>')
    }
  }
}
function catVideos(){
  $('#cat_imagens').html();
  dir='app/Dados/videos';
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      vl=name;
      option=name.replace(dir+'/','');
      $('#cat_videos').append('<option value="'+vl+'">'+option+'</option>');
      if(i==0){
        lista_video(vl);
      }
    }else{
      //é um arquivo
    }
  }
}
catVideos();
function lista_video(dir){
  $('#preview-videos').html('');
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      //É um diretorio
    }else{
      img=name.replace(dir,dir+'/thumb');
      img=img.replace('app/','');
      img=img.replace('.mp4','.jpg');
      video=name.replace('app/','');
      list='<li><img src="'+img+'" onclick="viewVideo(\''+video+'\')"></li>';
      if (fs.existsSync('app/'+img)) {
        //Se o arquivo existir
        $('#preview-videos').append(list);
      }else{
        //Se não existir
        cmd = 'ffmpeg -ss 00:00:02 -i app/'+video+' -vf scale=400:-1 -vframes 1 app/'+img;
        exec(cmd).then(function (result) {
          $('#preview-videos').append(list);
        }).catch(function (err) {
            console.error('ERROR: ', err);
        });
      }
    }
  }
}
function viewVideo(url){
  $('#preview img').css('display','none');
  $('#video').css('display','block');
  var socket = io.connect("http://localhost:3000");
  var text = '{"funcao":[' +
  '{"nome":"video","valor":"'+url+'" }]}';
      socket.emit("send", text);
  $('#player').append('<source src="'+url+'" type="video/mp4">');
  player = document.getElementById("player");
  player.play();
}
function viewYoutube(url){

}
function alerta(texto){

}