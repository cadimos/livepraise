//Variaveis Globais
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
const dir_app = process.cwd();
const fs = require('fs');
const exec = require('child-process-promise').exec;
var player = document.getElementById("player");
var socket = io.connect("http://localhost:3000");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dir_app+'/dsw.db');

//Teclado
const KEY_DOWN = 40;
const KEY_UP = 38;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;

const KEY_END = 35;
const KEY_BEGIN = 36;

const KEY_BACK_TAB = 8;
const KEY_TAB = 9;
const KEY_SH_TAB = 16;
const KEY_ENTER = 13;
const KEY_ESC = 27;
const KEY_SPACE = 32;
const KEY_DEL = 46;

const KEY_ALT = 18;
const KEY_CTRL = 17;
const KEY_SHIFT = 16;

const KEY_A = 65;
const KEY_B = 66;
const KEY_C = 67;
const KEY_D = 68;
const KEY_E = 69;
const KEY_F = 70;
const KEY_G = 71;
const KEY_H = 72;
const KEY_I = 73;
const KEY_J = 74;
const KEY_K = 75;
const KEY_L = 76;
const KEY_M = 77;
const KEY_N = 78;
const KEY_O = 79;
const KEY_P = 80;
const KEY_Q = 81;
const KEY_R = 82;
const KEY_S = 83;
const KEY_T = 84;
const KEY_U = 85;
const KEY_V = 86;
const KEY_W = 87;
const KEY_X = 88;
const KEY_Y = 89;
const KEY_Z = 90;

const KEY_PF1 = 112;
const KEY_PF2 = 113;
const KEY_PF3 = 114;
const KEY_PF4 = 115;
const KEY_PF5 = 116;
const KEY_PF6 = 117;
const KEY_PF7 = 118;
const KEY_PF8 = 119;

//Loanding

//Muda a cor da arvore
var stop_color=false;
function color_animate(tempo){
  let r=Math.floor(Math.random() * 256);
  let g=Math.floor(Math.random() * 256);
  let b=Math.floor(Math.random() * 256);
  let r2=Math.floor(Math.random() * 256);
  let g2=Math.floor(Math.random() * 256);
  let b2=Math.floor(Math.random() * 256);
  let r3=Math.floor(Math.random() * 256);
  let g3=Math.floor(Math.random() * 256);
  let b3=Math.floor(Math.random() * 256);
  $('.tree').css('fill','url(#gradient)');
  $('#inicio_gradiente').attr('stop-color','rgb('+r+','+g+','+b+')');
  $('#meio_gradiente').attr('stop-color','rgb('+r2+','+g2+','+b2+')');
  $('#fim_gradiente').attr('stop-color','rgb('+r3+','+g3+','+b3+')');
  setTimeout(() => color_animate(tempo),tempo);
}

function parar_cor(){
  stop_color = true;
  return true;
}
function loanding(){
  $('#current_loading').html('Iniciando Animaçao');
  color_animate(5000);
  $('#current_loading').html('Carregando Imagens');
  catImagens();
  $('#current_loading').html('Carregando Vídeos');
  catVideos();
  $('#current_loading').html('Carregando Músicas');
  catMusicas();
  $('#current_loading').html('Listando Músicas');
  setTimeout(() => lista_musica(),300);
  $('#current_loading').html('Carregando Biblias');
  catBiblias();
  $('#current_loading').html('Listando livros da Biblias');
  setTimeout(() => lista_biblia(),200);
}
function fechar_loandig(){
  $('#loading').css('display','none');
}
setTimeout(() => loanding(), 200);
//Remove Quebra de Linha Substituindo por <br />
function nl2br (str) {
  var breakTag = '<br '+'/>';
  return str.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/gm, breakTag);
}

//Remove o Conteudo da Tela
function removeConteudo(){
  $('.texto span').html('');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +
  '{"nome":"removeConteudo","valor":"remove" }]}';
    socket.emit("send", text);
  }
}

//Troca o Fundo da Tela
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

// Troca o Fundo Removendo o Texto
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

//Exibe Texto na Tela
function texto(id,br){
  txt=$('#'+id).html();
  if(br=='BR'){
    txt=nl2br(txt);
  }
  $('.texto span').html(txt);
  $('.texto').textfill({
    maxFontPixels: 0
  });
  $('.texto').css('text-align','center');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
  }
}

//Congela a tela, permitindo alterações apenas na do operador
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
/* Funções de Imagens */

//Lista a Categoria das Imagens
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
  $('#current_loading').html('Carregado Imagens');
}

//Lista Imagens
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
  $('#current_loading').html('Carregado Preview de Imagens');
}

/* Funções de Videos */

//Lista as Categorias de Videos
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
  $('#current_loading').html('Carregado Vídeos');
}

//Lista Videos
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
  $('#current_loading').html('Carregado Preview de Vídeos');
}
//Visualiza o Video
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

/* Funções de Música */

//Lista as Categorias de Musicas
function catMusicas(){
  db.serialize(function() {
    db.each("SELECT id,nome FROM cat_musicas", function(err, row) {
      $('#cat_musica').append('<option value="'+row.id+'">'+row.nome+'</option>');
    });
    $('#current_loading').html('Carregado Músicas');
  });
}

//Lista as Musicas
function lista_musica(){
  cat=$('#cat_musica').val();
  modelo=`<div class="panel panel-default">
  <div class="panel-heading" role="tab" id="head[id_musica]">
  <h4 class="panel-title">
  <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
  [nome_musica] ([artista_musica])
  </a>
  <span class="acoes_item">
    <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
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
      item=modelo.replace(/\[id_musica\]/g,musica.id);
      item=item.replace(/\[nome_musica\]/g,musica.nome);
      item=item.replace(/\[artista_musica\]/g,musica.artista);
      $('#list_music').append(item);
      db.each("SELECT id,verso FROM musica_versos WHERE `musica`='"+musica.id+"'", function(err, row) {
        verse=row.verso;
        verse=verse.replace(/<br \/>/g,"\n");
        $('#verso'+musica.id).append('<li onclick="texto(\'verso_'+musica.id+'_'+row.id+'\',\'BR\');" id="verso_'+musica.id+'_'+row.id+'">'+verse+'</li>');
      });
    });
    $('#current_loading').html('Listado Músicas');
  });
}

//Salva as Musicas
function salvar_musica(id){
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
    if(id==0){
      db.serialize(function() {
        db.run("INSERT INTO `musica` (`cat`,`nome`,`nome2`,`artista`,`compositor`) VALUES ('"+cat+"','"+nome+"','"+nome+"','"+artista+"','"+compositor+"')");
        db.each("SELECT id FROM musica ORDER BY  id  DESC LIMIT 1", function(err, row) {
          id_musica=row.id;
          for(i=0;i<t_versos;i++){
            db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
          }
        });
      });
    }else{
      db.serialize(function() {
        db.run("UPDATE `musica` SET `nome`='"+nome+"',`nome2`='"+nome+"',`artista`='"+artista+"',`compositor`='"+compositor+"' WHERE `id`='"+id+"'");
        db.run("DELETE FROM `musica_versos` WHERE `id`='"+id+"'");
        db.each("SELECT id FROM musica WHERE `id`='"+id+"' ORDER BY  id  DESC LIMIT 1", function(err, row) {
          id_musica=row.id;
          for(i=0;i<t_versos;i++){
            db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
          }
        });
      });
    }
    $('#new_music').modal('hide');
    $('#new_music #nome').val('');
    $('#new_music #artista').val('');
    $('#new_music #compositor').val('');
    $('#new_music #letra').val('');
    alert('Música salva com sucesso!');
    lista_musica();
  }
}

//Adiciona a Música na Programação
function adicionar_musica(id){
  verse=$('#verso'+id).html();
  verse=verse.replace(/verso_/g,"item_verso_");
  verse=verse.replace(/'BR'/g,"");
  verse=nl2br(verse);
  data='<ul id="item_verso'+id+'">'+verse+'</ul>';
  titulo=$('#head'+id+' a').html();
  chromeTabs.addTab({
    title: titulo,
    conteudo: data
  });
}
//Editar Musica
$('#new_music').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget) // Button that triggered the modal
  var cod = button.data('whatever') // Extract info from data-* attributes
  if(cod!='undefined' && cod!=null){
    //Editar
    db.serialize(function() {
      db.each("SELECT id,nome,artista,compositor FROM musica WHERE id='"+cod+"'", function(err, musica) {
        $('#nome').val(musica.nome);
        $('#artista').val(musica.artista);
        $('#compositor').val(musica.compositor);
        $('#letra').html('');
        $('#button_salvar_musica').attr('onclick','salvar_musica('+musica.id+');')
        db.each("SELECT id,verso FROM musica_versos WHERE `musica`='"+musica.id+"'", function(err, row) {
          verse=row.verso;
          verse=verse.replace(/<br \/>/g,"\n");
          $('#letra').append(verse+"\n\n");
        });
      });
    });
  }else{
    $('#button_salvar_musica').attr('onclick','salvar_musica(0);')
  }
});

/* Funções de Biblia */
//Lista as Biblias Disponiveis
function catBiblias(){
  db.serialize(function() {
    db.each("SELECT id,nome FROM cat_biblia", function(err, row) {
      $('#cat_biblia').append('<option value="'+row.id+'">'+row.nome+'</option>');
    });
    $('#current_loading').html('Carregando Biblias');
  });
}

//Lista a Biblia Selecionada
function lista_biblia(){
  modelo_biblia=`<div class="panel panel-default">
  <div class="panel-heading" role="tab" id="head_biblia_[id_livro]">
      <h4 class="panel-title">
          <a role="button" data-toggle="collapse" data-parent="#list_biblia" href="#collapse_biblia_[id_livro]" aria-expanded="true" aria-controls="collapse_biblia_[id_livro]">
              [nome_livro]
          </a>
      </h4>
  </div>
  <div id="collapse_biblia_[id_livro]" class="panel-collapse collapse" role="tabpanel" aria-labelledby="head_biblia_[id_livro]">
      <div class="panel-body">
          <div class="panel-group" id="list_biblia_[id_livro]" role="tablist" aria-multiselectable="true">
          </div>
      </div>
  </div>
</div>`;
  modelo_capitulos=`<div class="panel panel-success">
  <div class="panel-heading" role="tab" id="head_[id_livro]_[id_capitulo]">
      <h4 class="panel-title">
          <a onclick="lista_versiculo([cat],[id_livro],[id_capitulo])" role="button" data-toggle="collapse" data-parent="#list_biblia_[id_livro]" href="#collapse_[id_livro]_[id_capitulo]" aria-expanded="true" aria-controls="collapse1">
            <i class="fas fa-bible"></i>  [id_capitulo]
          </a>
          <span class="acoes_item">
              <a href="javascript:void(0);" onclick="adicionar_biblia_capitulo('[id_livro]_[id_capitulo]')"><i class="fas fa-check-circle"></i></a>
          </span>
      </h4>
  </div>
  <div id="collapse_[id_livro]_[id_capitulo]" class="panel-collapse collapse" role="tabpanel" aria-labelledby="head_[id_livro]_[id_capitulo]">
      <div class="panel-body">
          <ul id="versiculo"></ul>
      </div>
  </div>
</div>`;
  $('#list_biblia').html('');
  db.serialize(function() {
    db.each("SELECT id,nome FROM biblia_livros", function(err, biblia) {
      $('#current_loading').html('Listando Livros da Biblias');
      item=modelo_biblia.replace(/\[id_livro\]/g,biblia.id);
      item=item.replace(/\[nome_livro\]/g,biblia.nome);
      cat=$('#cat_biblia').val();
      item=item.replace(/\[cat\]/g,biblia.nome);
      $('#list_biblia').append(item);
      db.each("SELECT DISTINCT capitulo FROM biblia_versiculos WHERE  cat ="+cat+" AND  livro ="+biblia.id+";", function(err, biblia_capitulos) {
        capitulos=modelo_capitulos.replace(/\[id_livro\]/g,biblia.id);
        capitulos=capitulos.replace(/\[id_capitulo\]/g,biblia_capitulos.capitulo);
        if(biblia.id==66 && biblia_capitulos.capitulo==22){
          $('#current_loading').html('Listado Biblias');
          setTimeout(() => fechar_loandig(),100);
        }
        $('#current_loading').html('Listando Livros da Biblias: '+biblia.nome+' '+biblia_capitulos.capitulo);
        $('#list_biblia_'+biblia.id).append(capitulos);
      });
    });
  });
}

//Funçao de Listar os Versiculos por demanda
function lista_versiculo(cat,livro,capitulo){
  modelo_versiculo=`<li onclick="texto('versiculo_[id_capitulo]_[id_versiculo]','BR');" id="versiculo_[id_capitulo]_[id_versiculo]">[texto]</li>`;
  modelo_versiculo=modelo_versiculo.replace(/\[id_livro\]/g,livro);
  modelo_versiculo=modelo_versiculo.replace(/\[id_capitulo\]/g,capitulo);
  db.serialize(function() {
    db.each("SELECT id,texto FROM biblia_versiculos WHERE  cat ="+cat+" AND  livro ="+livro+" AND capitulo="+capitulo+";", function(err, biblia_versiculo) {
      versiculo=modelo_versiculo.replace(/\[id_versiculo\]/g,biblia_versiculo.id);
      versiculo=versiculo.replace(/\[texto\]/g,biblia_versiculo.texto);
      $('#collapse_'+livro+'_'+capitulo+' #versiculo').append(versiculo);
    });
  });
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
      favicon: '',
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

var pressedCtrl = false; //variável de controle
$(document).keyup(function (e) {  //O evento Kyeup é acionado quando as teclas são soltas
  if(e.which == KEY_CTRL) pressedCtrl=false; //Quando qualuer tecla for solta é preciso informar que Crtl não está pressionada
  })
$(document).keydown(function (e) { //Quando uma tecla é pressionada
  if(e.which == KEY_CTRL) pressedCtrl = true; //Informando que Crtl está acionado
  if((e.which == KEY_ENTER|| e.keyCode == KEY_ENTER) && pressedCtrl == true) { //Reconhecendo tecla Enter
    alert('O comando Crtl+Enter foi acionado')
    }
  if(e.which == KEY_LEFT || e.keyCode == KEY_LEFT){
    alert('Tecla para esquerda pressionada')
  }
});