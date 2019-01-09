//Variaveis Globais
const dir_app = process.cwd();
const fs = require('fs');
const exec = require('child-process-promise').exec;
var player = document.getElementById("player");
var socket = io.connect("http://localhost:3000");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dir_app+'/dsw.db');

function nl2br (str) {
  var breakTag = '<br '+'/>';
  return str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/gm, breakTag);
}

function salvar_musica(){
  nome=$('#new_music #nome').val();
  if(nome==''){
    alert('O nome da Música é Obrigatória!');
  }
  artista=$('#new_music #artista').val();
  if(artista==''){
    alert('O nome do Artista é Obrigatória!');
  }
  compositor=$('#new_music #compositor').val();
  cat=1;
  letra=$('#new_music #letra').val();
  if(letra==''){
    alert('A letra da Música é Obrigatória!');
  }
  if(nome!='' && artista!='' && letra!=''){
    letra=nl2br(letra);
    versos=letra.split("<br /><br />");
    t_versos=versos.length;
    db.serialize(function() {
      db.run("INSERT INTO `musica` (`cat`,`nome`,`nome2`,`artista`,`compositor`) VALUES ('"+cat+"','"+nome+"','"+nome+"','"+artista+"','"+compositor+"')");
      db.each("SELECT id FROM musica ORDER BY  id  DESC LIMIT 1", function(err, row) {
        id_musica=row.id;
        for(i=0;i<t_versos;i++){
          db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
        }
      });
    });
    $('#new_music').modal('hide');
    $('#new_music #nome').val('');
    $('#new_music #artista').val('');
    $('#new_music #compositor').val('');
    $('#new_music #letra').val('');
    alert('Música salva com sucesso!');
  }
}
function background(url){
  $('#video').css('display','none');
  $('#preview img').css('display','block');
  $("#preview img").fadeOut(150, function() {
    $("#preview img").attr('src',url);
  }).fadeIn(200);
  if(congelar('valida')==true){
    var text = '{"funcao":[' +
  '{"nome":"background","valor":"'+url+'" }]}';
    socket.emit("send", text);
  }
  player.pause();
}
function backgroundRapido(url){
    $('#video').css('display','none');
    $('#preview img').css('display','block');
    $("#preview img").fadeOut(150, function() {
        $("#preview img").attr('src',url);
    }).fadeIn(200);
    if(congelar('valida')==true){
      var text = '{"funcao":[' +
  '{"nome":"background","valor":"'+url+'" }]}';
      socket.emit("send", text);
    }
    setTimeout(() => removeConteudo(), 200);
    player.pause();
}
function removeConteudo(){
  $('.texto span').html('');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +
  '{"nome":"removeConteudo","valor":"remove" }]}';
    socket.emit("send", text);
  }
}
function texto(id){
  txt=$('#'+id).html();
  $('.texto span').html(txt);
  $('.texto').textfill({
    maxFontPixels: 0
  });
  $('.texto').css('text-align','center');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +
'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
  }
}
function catImagens(){
  $('#cat_imagens').html();
  dir=dir_app+'/Dados/imagens';
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
      img=name;
      img=img.replace('#','%23');
      $('#preview-imagens').append('<li><img src="'+img+'" onclick="background(\''+img+'\')"></li>')
    }
  }
}
function catVideos(){
  $('#cat_imagens').html();
  dir=dir_app+'/Dados/videos';
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
      img=img.replace('.mp4','.jpg');
      video=name;
      list='<li><img src="'+img+'" onclick="viewVideo(\''+video+'\')"></li>';
      if (fs.existsSync(img)) {
        //Se o arquivo existir
        $('#preview-videos').append(list);
      }else{
        //Se não existir
        cmd = 'ffmpeg -ss 00:00:02 -i '+video+' -vf scale=400:-1 -vframes 1 '+img;
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
  if(congelar('valida')==true){
    var text = '{"funcao":[' +
  '{"nome":"video","valor":"'+url+'" }]}';
    socket.emit("send", text);
  }
  $('#player').html('');
  $('#player').append('<source src="'+url+'" type="video/mp4">');
  player.play();
}
function catMusicas(){
  db.serialize(function() {
    db.each("SELECT id,nome FROM cat_musicas", function(err, row) {
      $('#cat_musica').append('<option value="'+row.id+'">'+row.nome+'</option>');
    });
  });
}
catMusicas();
function lista_musica(){
  cat=$('#cat_musica').val();
  modelo=`<div class="panel panel-default">
  <div class="panel-heading" role="tab" id="head[id_musica]">
  <h4 class="panel-title">
  <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
  [nome_musica] ([artista_musica])
  </a>
  <span class="acoes_item">
    <a href="javascript:void(0);" onclick=""><i class="fas fa-edit"></i></a>
    <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
  </span>
  </h4>
  </div>
  <div id="collapse[id_musica]" class="panel-collapse collapse" role="tabpanel" aria-labelledby="head[id_musica]">
  <div class="panel-body">
  <ul id="verso[id_musica]"></ul>
  </div>
  </div>
  </div>`;

  $('#list_music').html('');
  db.serialize(function() {
    db.each("SELECT id,nome,artista FROM musica WHERE cat='"+cat+"'", function(err, musica) {
      item=modelo.replace('[id_musica]',musica.id);
      item=item.replace('[id_musica]',musica.id);
      item=item.replace('[id_musica]',musica.id);
      item=item.replace('[id_musica]',musica.id);
      item=item.replace('[id_musica]',musica.id);
      item=item.replace('[id_musica]',musica.id);
      item=item.replace('[nome_musica]',musica.nome);
      item=item.replace('[artista_musica]',musica.artista);
      $('#list_music').append(item);
      db.each("SELECT id,verso FROM musica_versos WHERE `musica`='"+musica.id+"'", function(err, row) {
        $('#verso'+musica.id).append('<li onclick="texto(\'verso_'+musica.id+'_'+row.id+'\');" id="verso_'+musica.id+'_'+row.id+'">'+row.verso+'</li>');
      });
    });
  });
}
function adicionar_musica(id){
  data='<ul id="item_verso'+id+'">'+$('#verso'+id).html()+'</ul>';
  titulo=$('#head'+id+' a').html();
  chromeTabs.addTab({
    title: titulo,
    conteudo: data
  });
}
setTimeout(() => lista_musica(),200);
function congelar(acao){
  s=$('#freeze').html();
  if(acao=='freeze'){
    if(s=='Congelar'){
      $('#freeze').html('Descongelar');
    }else{
      $('#freeze').html('Congelar');
    }
  }else{
    if(s=='Congelar'){
      return true;
    }else{
      return false;
    }
  }
}
function viewYoutube(url){

}
function alerta(texto){

}

//Tabs List
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
//db.close();