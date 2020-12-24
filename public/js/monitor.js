var socket = io.connect("http://localhost:3000");
socket.emit("join", 'Remoto');
socket.on("chat", function(client,msg) {
  if(client=='Monitor'){
    obj = JSON.parse(msg);
		fn=obj.funcao[0].nome;
		vl=obj.funcao[0].valor;
		vl=atob(vl);
		console.log('Função: '+fn+' e Valor: '+vl);
		switch(fn){
			case 'background':
				background(vl);
			break;

			case 'texto':
				texto(vl);
			break;

			case 'video':
				video(vl);
			break;

			case 'removeConteudo':
				removeConteudo();
			break;

			case 'atualizar':
				atualizar(vl);
			break;

			case 'viewMusica':
				viewMusica(vl);
			break;

			case 'viewBiblia':
				viewBiblia(vl);
			break;

			case 'ajustarTela':
				v=vl.indexOf('x');
				if(v<0){
					ajustarTela(vl);
				}else{
					medidas=vl.split('x');
					w=medidas[0];
					h=medidas[1];
					ajustarTela(w,h);
				}
			break;
		}
  }
});

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

//Remove Quebra de Linha Substituindo por <br />
function nl2br (str) {
  if (typeof str === 'undefined' || str === null) {
    return ''
  }
  var breakTag = `<br />`;
  return (str + '').replace(/(\r\n|\n\r|\r|\n)/g, breakTag)
}

function addslashes(str) {
  str = str.replace(/\\/g, '\\\\');
  str = str.replace(/\'/g, '\\\'');
  str = str.replace(/\"/g, '\\"');
  str = str.replace(/\0/g, '\\0');
  return str;
}

function stripslashes(str) {
  str = str.replace(/\\'/g, '\'');
  str = str.replace(/\\"/g, '"');
  str = str.replace(/\\0/g, '\0');
  str = str.replace(/\\\\/g, '\\');
  return str;
}

function iso_encode(str){
  str = str.replace(/\'/g, '&apos;');
  str = str.replace(/\"/g, '&quot;');
  return str;
}
//Inicio Loanding

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
  $('#current_loading').html('Iniciando...');
  color_animate(4000);
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
  lista_background_rapido();
  lista_tela();
}

function fechar_loandig(){
  $('#loading').css('display','none');
}

loanding();
//Fim Loanding

//Atualizar e Regarregar Janelas
function atualizar(vl){
  let txt='ok';
  if(vl!=txt){
    let text = '{"funcao":[' +'{"nome":"atualizar","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
  }
  setTimeout(() => location.reload(),100);
}

//Listagem Background Rápido
function lista_background_rapido(){
  let modelo=`<div class="col-xs-1 col-sm-1 col-md-1 col-lg-1 background-rapido">
	  <a href="javascript:void(0)" onclick="backgroundRapido('[url64]')">
	      <img src="[url]" class="img-responsive" alt="Responsive image">
	  </a>
	</div>`;
  $('#background-rapido').html('');
  /*
  db.serialize(function() {
    db.each("SELECT url,diretorio,inicial FROM background_rapido ORDER BY id ASC", function(err, res) {
      if(res.diretorio=='/'){
        dir=dir_app+'/';
      }else{
        dir=res.diretorio;
      }
      item_back=modelo.replace(/\[url\]/g,dir+res.url);
      item_back=item_back.replace(/\[url64\]/g,btoa(dir+res.url));
      $('#background-rapido').append(item_back);
      if(res.inicial=='S'){
        $('#preview img').attr('src',dir+res.url)
      }
    });
    $('#current_loading').html('Background Rápido');
  });
  */
}

//Marca o tipo de tela de projecao atual
function lista_tela(){
  /*
  db.serialize(function() {
    db.each("SELECT tipo,largura,altura FROM tela", function(err, res) {
      $('#tamanho_tela').val(res.tipo);
    });
  });
  */
}

//Ajustar tela
function ajustarTela(hide,h){
  tm=$('#conf_tela #tamanho_tela').val();
  lg=$('#conf_tela #largura').val();
  at=$('#conf_tela #altura').val();
  db.serialize(function() {
    db.run("UPDATE `tela` SET `tipo`='"+tm+"',`largura`='"+lg+"',`altura`='"+at+"'");
  });
  if(tm=='personalizado'){
    vl=btoa(lg+'x'+at)
    var text = '{"funcao":[' +
  '{"nome":"ajustarTela","valor":"'+vl+'" }]}';
  }else{
    var text = '{"funcao":[' +
  '{"nome":"ajustarTela","valor":"'+btoa(tm)+'" }]}';
  }
  socket.emit("send", text);
  if(hide){
    $('#conf_tela').modal('hide');
  }
}
//Remove o Conteudo da Tela
function removeConteudo(){
  $('.titulo').html('');
  $('.content').html('');
  $('.rodape').html('');
  $('.alert').html('');
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
	$("#preview img").attr('src',atob(url));
	}).fadeIn(200);
	if(congelar('valida')==true){
	var text = '{"funcao":[' +
	'{"nome":"background","valor":"'+url+'" }]}';
	socket.emit("send", text);
	}
  	if($('#player').length){
		let player = document.getElementById("player");
    	player.pause();
	}
}

// Troca o Fundo Removendo o Texto
function backgroundRapido(url){
    $('#video').css('display','none');
    $('#preview img').css('display','block');
    $("#preview img").fadeOut(150, function() {
        $("#preview img").attr('src',atob(url));
    }).fadeIn(200);
    if(congelar('valida')==true){
      var text = '{"funcao":[' +
  '{"nome":"background","valor":"'+url+'" }]}';
      socket.emit("send", text);
    }
    setTimeout(() => removeConteudo(), 200);
    if($('#player').length){
      let player = document.getElementById("player");
      player.pause();
    }
}

//Exibe Texto na Tela
function texto(id,br){
  txt=$('#'+id).html();
  if(br=='BR'){
    txt=nl2br(txt);
  }
  $('.content').append('<span>'+txt+'</span>');
  $('.content').textfill({
    maxFontPixels: 0
  });
  $('.content').css('text-align','center');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +'{"nome":"texto","valor":"'+btoa(txt)+'" }]}';
    socket.emit("send", text);
  }
}

//Congela a tela, permitindo alterações apenas na do operador
function congelar(acao){
  s=$('#freeze').val();
  if(acao=='freeze'){
    if(s=='congelar'){
      $('#button_freeze').html('<i class="fas fa-snowflake"></i> Descongelar');
      $('#freeze').val('descongelar');
    }else{
      $('#button_freeze').html('<i class="fas fa-snowflake"></i> Congelar');
      $('#freeze').val('congelar');
    }
  }else{
    if(s=='congelar'){
      return true;
    }else{
      return false;
    }
  }
}
// Funções de Imagens

//Lista a Categoria das Imagens
function catImagens(){
  $('#cat_imagens').html();
  /*
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
  */
}
/*
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
      $('#preview-imagens').append('<li><img src="'+img+'" onclick="background(\''+btoa(img)+'\')"></li>')
    }
  }
  $('#current_loading').html('Carregado Preview de Imagens');
}
*/
// Funções de Videos

//Lista as Categorias de Videos
function catVideos(){
  $('#cat_imagens').html();
  /*
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
  */
}

//Lista Videos
function gera_thumb(video,img,i){
  cmd = ffmpeg.path+' -ss 00:00:02 -i '+video+' -vf scale=400:-1 -vframes 1 '+img;
  exec(cmd).then((result) => {
    setTimeout(() =>{
      action=result.childProcess.spawnargs[2];
      nv_img=action.split('vframes 1 ');
      nv_img=nv_img[1];
      $('#video'+i).attr('src',nv_img);
      console.log(i+' - '+nv_img);
    },1000);
  }).catch(function (err) {
      console.error('ERROR: ', err);
  });
}
function lista_video(dir){
  $('#preview-videos').html('');
  var files = fs.readdirSync(dir);
  for (var i in files){
    orgname=files[i];
    rn=orgname.replace( /\s/g, '' );
    var name = dir + '/' + rn;
    if(orgname!=rn){
      fs.rename(dir + '/'+orgname, name, function (err) {

      });
    }
    try{
      if(fs.lstatSync(name).isDirectory()){
        //É um diretorio
      }else{
        img=name.replace(dir,dir+'/thumb');
        img=img.replace('.mp4','.jpg');
        img=img.replace('.mpg','.jpg');
        img=img.replace('.avi','.jpg');
        video=name;
        ext=name.substr(-4);
        ext=ext.replace(/\./g,'');
        newVideo=video.replace(ext,'mp4');
        list='<li><img id="video'+i+'" src="'+img+'" onclick="viewVideo(\''+btoa(newVideo)+'\')"></li>';
        if (fs.existsSync(img)) {
          //Se o arquivo existir
          $('#preview-videos').append(list);
        }else{
          //Se não existir
          gera_thumb(video,img,i);
          
          if(ext!='mp4'){
            cnv = ffmpeg.path+' -i '+video+' -f mp4 -vcodec libx264 -preset fast -profile:v main -acodec aac '+newVideo+' -hide_banner';
            exec(cnv).then(function(result){
              fs.unlink(video, (err) => {
              });
              $('#preview-videos').append(list);
            }).catch(function (err) {
              console.error('ERROR: ', err);
            });
          }else{
            $('#preview-videos').append(list);
          }
        }
      }
    }catch(e){
    }
  }
  $('#current_loading').html('Carregado Preview de Vídeos');
}
function play_video(){
	player.play();
	player.volume=0;
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
  $('#video').html('');
  $('#video').append('<video id="player" controls loop="true" autoplay><source src="'+atob(url)+'" type="video/mp4"></video>');
  let player = document.getElementById("player");
  setTimeout(() => play_video(),200);
}

// Funções de Música

//Lista as Categorias de Musicas
function catMusicas(){
  /*
  db.serialize(function() {
    db.each("SELECT `id`,`nome` FROM cat_musicas", function(err, row) {
      $('#cat_musica').append('<option value="'+row.id+'">'+row.nome+'</option>');
    });
    $('#current_loading').html('Carregado Músicas');
  });
  */
}

//Lista as Musicas
function lista_musica(){
  cat=$('#cat_musica').val();
 	if(cat!=''){
	  	let modelo=`<div class="panel panel-default">
      <div class="panel-heading" role="tab" id="head[id_musica]">
      <h4 class="panel-title">
      <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
      [nome_musica] ([artista_musica])
      </a>
      <span class="acoes_item">
        <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
        <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
        <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
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
      /*
      db.serialize(function() {
        db.each("SELECT id,nome,artista FROM musica WHERE cat='"+cat+"' ORDER BY nome ASC", function(err, musica) {
          item=modelo.replace(/\[id_musica\]/g,musica.id);
          item=item.replace(/\[nome_musica\]/g,musica.nome);
          item=item.replace(/\[artista_musica\]/g,musica.artista);
          $('#list_music').append(item);
          db.each("SELECT id,verso FROM musica_versos WHERE `musica`='"+musica.id+"'", function(err, row) {
            verse=row.verso;
            verse=verse.replace(/<br \/>/g,"\n");
            modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_${musica.id}_${row.id}","${musica.nome} (${musica.artista})","BR");' id="verso_${musica.id}_${row.id}">${verse}</li>`;
            $('#verso'+musica.id).append(modelo_item);
          });
        });
        $('#current_loading').html('Listado Músicas');
      });
      */
  	}else{
  		setTimeout(() => lista_musica(),200);
  	}
}

function slideAtivo(){
  if(!$('.chrome-conteudo-show ul').length){
    setTimeout(() => slideAtivo(),200);
  }else{
    currenteId=document.querySelector(".chrome-conteudo-show ul").id;
    header = document.getElementById(currenteId);
    btns = header.getElementsByClassName("item_verso_musica");
    for (i = 0; i < btns.length; i++) {
      current = document.getElementsByClassName("ativo");
      btns[i].addEventListener("click", function() {

        if (current.length > 0) {
          current[0].className = current[0].className.replace(" ativo", "");
        }
        this.className += " ativo";
      });
    }
  }
}
/*
//Busca Musica
function buscaMusicaLocal(){
  cat=$('#cat_musica').val();
  busca=$("#busca_musica").val();
  if(busca.length<3){
    lista_musica();
  }else	if(cat!=''){
    let modelo=`<div class="panel panel-default">
    <div class="panel-heading" role="tab" id="head[id_musica]">
    <h4 class="panel-title">
    <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
    [nome_musica] ([artista_musica])
    </a>
    <span class="acoes_item">
      <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
      <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
      <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
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
      db.each("SELECT id,nome,artista FROM musica WHERE cat='"+cat+"' AND (`nome` LIKE '%"+busca+"%' OR `artista` LIKE '%"+busca+"%') ORDER BY nome ASC", function(err, musica) {
        item=modelo.replace(/\[id_musica\]/g,musica.id);
        item=item.replace(/\[nome_musica\]/g,musica.nome);
        item=item.replace(/\[artista_musica\]/g,musica.artista);
        $('#list_music').append(item);
        db.each("SELECT id,verso FROM musica_versos WHERE `musica`='"+musica.id+"'", function(err, row) {
          verse=row.verso;
          verse=verse.replace(/<br \/>/g,"\n");
          modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_${musica.id}_${row.id}","${musica.nome} (${musica.artista})","BR");' id="verso_${musica.id}_${row.id}">${verse}</li>`;
          $('#verso'+musica.id).append(modelo_item);
        });
      });
    });
  }
}

function buscaMusicaOnline(){
  busca=$("#busca_musica").val();
  if(busca.length<3){
    lista_musica();
  }else{
    $('#list_music').html('');
    let modelo_web=`<div class="panel panel-default">
	  <div class="panel-heading" role="tab" id="head[id_musica]">
	  <h4 class="panel-title">
	  <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
	  [nome_musica] ([artista_musica])
	  </a>
	  <span class="acoes_item">
	    <a href="javascript:void(0);" onclick='adicionar_musica_salvar("[id_musica]","[nome_musica]","[artista_musica]","[compositor_musica]")'><i class="fas fa-check-circle"></i></a>
	  </span>
	  </h4>
	  </div>
	  <div id="collapse[id_musica]" class="panel-collapse collapse" role="tabpanel" aria-labelledby="head[id_musica]">
	  <div class="panel-body">
	  <ul id="verso[id_musica]"></ul>
	  </div>
	  </div>
    </div>`;
    $('#list_music').append('<div class="alert alert-info" role="alert" id="alerta_pesquisa_musica">Procurando Música na Internet</div>');
    $.ajax({
      type: "GET",
      url: "https://api.cadimos.tk/busca/musicas/"+encodeURI(busca),
      dataType: "json",
      error: function(erro){
        $('#alerta_pesquisa_musica').remove();
        $('#list_music').append('<div class="alert alert-danger" role="alert" id="alerta_erro_musica">Houve um erro ao Buscar a música na internet. Verifique sua conexão e tente novamente!</div>');
        $('#alerta_erro_musica').fadeOut(10000,function(){
          $(this).remove();
        });
      },
      success: function(data) {
        $('#alerta_pesquisa_musica').remove();
        $('#list_music').append('<div class="alert alert-success" role="alert" id="alerta_sucesso_musica">Localizado Músicas na Internet</div>');
        $('#alerta_sucesso_musica').fadeOut(2000,function(){
          $(this).remove();
        });
      	t_resultado=data.resultado.length;
        for(i=0;i<t_resultado;i++){
          result=data.resultado[i];
          item=modelo_web.replace(/\[id_musica\]/g,'api'+result.id);
          item=item.replace(/\[nome_musica\]/g,result.nome);
          item=item.replace(/\[artista_musica\]/g,result.artista.trim());
          item=item.replace(/\[compositor_musica\]/g,result.compositor.trim());
          $('#list_music').append(item);
          t_verso=result.versos.length;
          for(v=0;v<t_verso;v++){
            verse=result.versos[v];
            verse=verse.replace(/<br \/>/g,"\n");
            let modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_api${result.id}_${v}","${result.nome} (${result.artista})","BR");' id="verso_api${result.id}_${v}">${verse}</li>`;
	          $('#verso'+'api'+result.id).append(modelo_item);
          }
        }
      }
    });
  }
}
*/
function buscaMusica(submit){
  if(!submit){
    buscaMusicaLocal();
  }else{
    buscaMusicaOnline();
  }
}

//Salva as Musicas
function salvar_musica(id){
  nome=$('#new_music #nome').val();
  if(nome==''){
    alert('O nome da Música é Obrigatória!');
  }
  nome=iso_encode(nome);
  artista=$('#new_music #artista').val();
  if(artista==''){
    alert('O nome do Artista é Obrigatória!');
  }
  artista=iso_encode(artista);
  compositor=$('#new_music #compositor').val();
  compositor=iso_encode(compositor);
  cat=1;
  letra=$('#new_music #letra').val();
  if(letra==''){
    alert('A letra da Música é Obrigatória!');
  }
  letra=iso_encode(letra);
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
            if(versos[i]!=''){
              db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
            }
          }
        });
      });
    }else{
      db.serialize(function() {
        db.run("UPDATE `musica` SET `nome`='"+nome+"',`nome2`='"+nome+"',`artista`='"+artista+"',`compositor`='"+compositor+"' WHERE `id`='"+id+"'");
        db.run("DELETE FROM `musica_versos` WHERE `musica`='"+id+"'");
        id_musica=id;
        for(i=0;i<t_versos;i++){
          if(versos[i]!=''){
            db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
          }
        }
      });
    }
    $('#new_music #nome').val('');
    $('#new_music #artista').val('');
    $('#new_music #compositor').val('');
    $('#new_music #letra').val('');
    $.alert({
      title: 'Sucesso!',
      content: 'Música salva com sucesso!',
    });
    $('#new_music').modal('hide');
    $('.modal-backdrop').remove();
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
  setTimeout(() => slideAtivo(),700);
}

function adicionar_musica_salvar(id,nome,artista,compositor){
  cat=1;
  versos=$('#verso'+id+' li');
  t_versos=versos.length;
  nome=iso_encode(nome);
  artista=iso_encode(artista);
  compositor=iso_encode(compositor);
  db.serialize(function() {
    db.run("INSERT INTO `musica` (`cat`,`nome`,`nome2`,`artista`,`compositor`) VALUES ('"+cat+"','"+nome+"','"+nome+"','"+artista+"','"+compositor+"')");
    db.each("SELECT id FROM musica ORDER BY  id  DESC LIMIT 1", function(err, row) {
      id_musica=row.id;
      for(i=0;i<t_versos;i++){
        v=$(versos[i]).html();
        v=iso_encode(v);
        db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+v+"')");
      }
    });
  });
  adicionar_musica(id);
}

//Remover Musica
function remover_musica(id,conf){
  rand=Math.floor(Math.random() * 1000000);
  if(conf!=true){
    $.confirm({
      title: 'Deseja Realmente Remover?',
      content: `<form action="" class="formName">
      <div class="form-group">
      <label>Digite o Código a seguir para Excluir: ${rand}</label>
      <input type="text" placeholder="Código" class="codigo form-control" required />
      </div>
      </form>
      `,
      buttons: {
          formSubmit: {
              text: 'Excluir',
              btnClass: 'btn-red',
              action: function () {
                  var cod = this.$content.find('.codigo').val();
                  if(!cod || cod!=rand){
                      $.alert('Código incorreto! Tente novamente');
                      return false;
                  }else{
                    db.serialize(function() {
                      db.run("DELETE FROM `musica` WHERE `id`='"+id+"'");
                      lista_musica();
                    });
                  }
              }
          },
          cancel: {
            text: 'Cancelar',
            action: function () {}
          }
      },
      onContentReady: function () {
          // bind to events
          var jc = this;
          this.$content.find('form').on('submit', function (e) {
              // if the user submits the form by pressing enter in the field.
              e.preventDefault();
              jc.$$formSubmit.trigger('click'); // reference the button and click it
          });
      }
    });
  }
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
        $('#letra').val('');
        $('#button_salvar_musica').attr('onclick','salvar_musica('+cod+');')
        db.each("SELECT `id`,`verso` FROM `musica_versos` WHERE `musica`='"+cod+"'", function(err, row) {
          verse=row.verso;
          verse=verse.replace(/<br \/>/g,"\n");
          verse=$('#letra').val()+verse+"\n\n";
          $('#letra').val(verse);
        });
      });
    });
  }else{
    $('#button_salvar_musica').attr('onclick','salvar_musica(0);')
  }
});

//Exibir Musica
function viewMusica(id,nome,br){

  $('.conteudo').html('');
  txt=$('#'+id).html();
  txt=iso_encode(txt);
  if(br=='BR'){
    txt=nl2br(txt);
  }
  let modelo=`
  <div class="titulo"></div>
  <div class="content"><span>${txt}</span></div>
  <div class="rodape">${nome}</div>`;
  $('.conteudo').append(modelo);
  $('.content').textfill({
    maxFontPixels: 0
  });
  $('.content').css('text-align','center');
  $('.rodape').css('font-size','20px');
  if(congelar('valida')==true){
    var text = '{"funcao":[' +'{"nome":"viewMusica","valor":"'+btoa(modelo)+'" }]}';
    socket.emit("send", text);
  }

}
// Funções de Biblia

//Lista as Biblias Disponiveis
function catBiblias(){
  /*
  db.serialize(function() {
    db.each("SELECT id,nome FROM cat_biblia", function(err, row) {
      $('#cat_biblia').append('<option value="'+row.id+'">'+row.nome+'</option>');
    });
    $('#current_loading').html('Carregando Biblias');
  }); 
  */
}

//Lista a Biblia Selecionada
function lista_biblia(){
  modelo_biblia=`<div class="panel panel-default">
  <a name="collapse_biblia_[id_livro]"></a>
  <div class="panel-heading livro" role="tab" id="head_biblia_[id_livro]">
      <h4 class="panel-title">
          <a role="button" data-toggle="collapse" data-parent="#list_biblia" href="#collapse_biblia_[id_livro]" aria-expanded="true" aria-controls="collapse_biblia_[id_livro]">
              [nome_livro]
          </a>
      </h4>
  </div>
  <div id="collapse_biblia_[id_livro]" class="biblia_livro panel-collapse collapse" role="tabpanel" aria-labelledby="head_biblia_[id_livro]">
      <div class="panel-body">
          <div class="panel-group" id="list_biblia_[id_livro]" role="tablist" aria-multiselectable="true">
          </div>
      </div>
  </div>
</div>`;
  modelo_capitulos=`<div class="panel panel-success">
  <a name="collapse_[id_livro]_[id_capitulo]"></a>
  <div class="panel-heading capitulo" role="tab" id="head_[id_livro]_[id_capitulo]">
      <h4 class="panel-title">
          <a onclick="lista_versiculo([cat],[id_livro],[id_capitulo])" role="button" data-toggle="collapse" data-parent="#list_biblia_[id_livro]" href="#collapse_[id_livro]_[id_capitulo]" aria-expanded="true" aria-controls="collapse1">
            <i class="fas fa-bible"></i>  [id_capitulo]
          </a>
          <span class="acoes_item"></span>
      </h4>
  </div>
  <div id="collapse_[id_livro]_[id_capitulo]" class="biblia_capitulo panel-collapse collapse" role="tabpanel" aria-labelledby="head_[id_livro]_[id_capitulo]">
      <div class="panel-body">
          <ul id="versiculo"></ul>
      </div>
  </div>
</div>`;
  $('#list_biblia').html('');
  $('#biblias #preview-list').append('<div id="loading_biblia"><i class="fa fa-spinner fa-pulse fa-3x fa-fw"></i><span>Carregando Biblia</span></div>');
  /*
  db.serialize(function() {
    db.each("SELECT id,nome FROM biblia_livros", function(err, biblia) {
      $('#current_loading').html('Listando Livros da Biblias');
      $('#loading_biblia span').html('Listando Livros da Biblias');
      item=modelo_biblia.replace(/\[id_livro\]/g,biblia.id);
      item=item.replace(/\[nome_livro\]/g,biblia.nome);
      cat=$('#cat_biblia').val();
      item=item.replace(/\[cat\]/g,cat);
      $('#list_biblia').append(item);
      db.each("SELECT DISTINCT capitulo FROM biblia_versiculos WHERE  cat ="+cat+" AND  livro ="+biblia.id+";", function(err, biblia_capitulos) {
        capitulos=modelo_capitulos.replace(/\[id_livro\]/g,biblia.id);
        capitulos=capitulos.replace(/\[id_capitulo\]/g,biblia_capitulos.capitulo);
        if(biblia.id==66 && biblia_capitulos.capitulo==22){
          $('#current_loading').html('Listado Biblias');
          $('#loading_biblia span').html('Listado Capitulos da Biblia');
          */
          setTimeout(() => fechar_loandig(),100);
          setTimeout(function(){
            $('#loading_biblia').remove();
            active_biblies();
          },200);
          /*
        }
        $('#current_loading').html('Listando Livros da Biblias: '+biblia.nome+' '+biblia_capitulos.capitulo);
        $('#loading_biblia span').html('Listando Livros da Biblias: '+biblia.nome+' '+biblia_capitulos.capitulo);
        $('#list_biblia_'+biblia.id).append(capitulos);
      },function (err,b){
        if(err){
          console.error(err);
        }
      });
    });
  });
  */
}
// Muda cor nos livros
function active_biblies(){
  $('#list_biblia .panel-collapse').on('show.bs.collapse', function () {
    $(this).siblings('.panel-heading').addClass('active');
  });

  $('#list_biblia .panel-collapse').on('hide.bs.collapse', function () {
    $(this).siblings('.panel-heading').removeClass('active');
  });
}

//Funçao de Listar os Versiculos por demanda
function lista_versiculo(cat,livro,capitulo){
  modelo_versiculo=`<a name="versiculo_[id_capitulo]_[id_versiculo]"></a><li onclick="viewBiblia('versiculo_[id_capitulo]_[id_versiculo]','[local_biblia]','BR');" id="versiculo_[id_capitulo]_[id_versiculo]" class="versiculo">[texto]</li>`;
  modelo_versiculo=modelo_versiculo.replace(/\[id_livro\]/g,livro);
  modelo_versiculo=modelo_versiculo.replace(/\[id_capitulo\]/g,capitulo);
  db.serialize(function() {
    db.each("SELECT id,texto,versiculo FROM biblia_versiculos WHERE  cat ="+cat+" AND  livro ="+livro+" AND capitulo="+capitulo+";", function(err, biblia_versiculo) {
      versiculo=modelo_versiculo.replace(/\[id_versiculo\]/g,biblia_versiculo.versiculo);
      versiculo=versiculo.replace(/\[texto\]/g,(biblia_versiculo.texto));
      versiculo=versiculo.replace(/\[local_biblia\]/g,livro+'-'+capitulo+'-'+biblia_versiculo.versiculo);
      $('#collapse_'+livro+'_'+capitulo+' #versiculo').append(versiculo);
    });
  });
}

//Exibir Musica
function viewBiblia(id,nome,br){
  $('.conteudo').html('');
  txt=$('#'+id).html();
  if(br=='BR'){
    txt=nl2br(txt);
  }
  let modelo=`
  <div class="titulo"></div>
  <div class="content"><span>${txt}</span></div>
  <div class="rodape"></div>`;
  $('.conteudo').append(modelo);
  $('.content').textfill({maxFontPixels: CalculaLinhas(5,'.content'),debug: true  });
  $('.content').css('text-align','left');
  $('.titulo').css('font-size','20px');
  nome=nome.split('-');
  db.serialize(function() {
    db.each("SELECT id,nome FROM biblia_livros WHERE `id`='"+nome[0]+"'", function(err, biblia) {
      $('.titulo').html(biblia.nome+' '+nome[1]+':'+nome[2]);
    });
  });
  $.each($('.versiculo'), function () {
    $(this).removeClass('ativo');
  });
  $('#'+id).addClass('ativo');
  if(congelar('valida')==true){
    setTimeout(function(){
      tit=$('.titulo').html();
      let modelo_send=`
      <div class="titulo">${tit}</div>
      <div class="content"><span>${txt}</span></div>
      <div class="rodape"></div>`;
      var text = '{"funcao":[' +'{"nome":"viewBiblia","valor":"'+btoa(modelo_send)+'" }]}';
      socket.emit("send", text);
    },200);
  }

}
// Busco na biblia
function buscaBiblia(){
  texto=$('#busca_biblia').val();
  n=texto.substr(0,1);
  n=n.match(/\d/g);
  str=texto.split(' ');
  if(n && str.length>1){
    livro=str[0]+' '+str[1];
    if(str.length>2){
      ref=str[2];
    }else{
      ref='';
    }
  }else{
    livro=str[0];
    if(str.length>1){
      ref=str[1];
    }else{
      ref='';
    }
  }
  att_livro=$('#collapse_biblia_'+IDLivro(livro)+'.in').length;
  if(!att_livro){
    att_livro='false';
  }
  if(att_livro=='false'){
    $('#head_biblia_'+IDLivro(livro)+' a').trigger('click');
    let ancora="#collapse_biblia_"+IDLivro(livro);
    location.href=ancora;
    $('#busca_biblia').focus();
  }
  if(ref!=''){
    if(ref.indexOf(":")>0){
      i=ref.split(':');
      capitulo=i[0];
      if(i.length>1){
        versiculo=i[1];
      }else{
        versiculo='';
      }
    }else{
      capitulo=ref;
      versiculo='';
    }
    att_cap=$('#collapse_'+IDLivro(livro)+'_'+capitulo+'.in').length;
    if(!att_cap){
      att_cap='false';
    }
    if(att_cap=='false'){
      $('#head_'+IDLivro(livro)+'_'+capitulo+' a').trigger('click');
      let ancora="#collapse_biblia_"+IDLivro(livro)+'_'+capitulo;
      location.href=ancora;
      $('#busca_biblia').focus();
    }
    if(versiculo){
      LimpaBiblia();
      if($('#versiculo_'+capitulo+'_'+versiculo).length){
        $('#versiculo_'+capitulo+'_'+versiculo).trigger('click');
        $('#versiculo_'+capitulo+'_'+versiculo).trigger('focus');
        let ancora='#versiculo_'+capitulo+'_'+versiculo;
        location.href=ancora;
        $('#busca_biblia').focus();
      }
    }
  }
}
var idLivro='';
function SetIDLivro(id){
  if(id){
    idLivro=id;
  }else{
    return idLivro;
  }
}
function IDLivro(str){
  db.serialize(function() {
    db.each("SELECT COUNT() as total,id FROM biblia_livros WHERE `nome` LIKE '"+str+"%' OR `nome2` LIKE '"+str+"%' LIMIT 1", function(err, result) {
      SetIDLivro(result.id);
    });
  });
  return SetIDLivro();
}
function LimpaBiblia(){
  $.each($('.versiculo'), function () {
    $(this).removeClass('ativo');
  })
}
function CalculaLinhas(quant,div){
  let largura=$(div).innerWidth();
  let altura=$(div).innerHeight();
  carcteres_linha=50;
  font=((altura/quant)-(largura/carcteres_linha))-quant;
  return font;
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

if(document.querySelector('button[data-remove-tab]')){
  document.querySelector('button[data-remove-tab]').addEventListener('click', function(){
    chromeTabs.removeTab(el.querySelector('.chrome-tab-current'))
  });
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
  if(e.which == KEY_LEFT || e.keyCode == KEY_LEFT || e.which == KEY_RIGHT || e.keyCode == KEY_RIGHT){
    if(!$('#busca_musica').is(':focus') || $('#busca_musica').val()==''){
      //percorre todo sequencia atual
      let proximo = 1;
      let index = 1;
      $.each($('.chrome-conteudo-show .item_verso_musica'), function () {
        if($(this).hasClass('ativo')) {
          switch (e.keyCode) {
            case KEY_RIGHT:
              proximo += index;
              break;
            case KEY_LEFT:
              proximo = index - 1;
              break;
          }
        }
        index++;
      });
      index = 1;
      // VERIFICA SE O RETORNO É MAIOR QUE O NUMERO TOTAL DE DIVS E RETORNA FALSO PARA A NAVEGACAO NÃO SAIR DE DAS DIVS
      if(proximo > $('.chrome-conteudo-show .item_verso_musica').length) {
          return false;
      // VERIFICA SE O RETORNO É MENOR QUE 1 E RETORNA FALSO PARA A NAVEGAÇÃO NÃO SAIR DAS DIVS
      }else if(proximo < 1 ) {
          return false;
      }
      // PERCORRE TODAS AS DIVS ITEMS PARA ATRIBUIR A CLASSE SELECTED NA DIV QUE O CURSOR DEVE IR SETADO NA VARIAVEL PROXIMO
      $.each($('.chrome-conteudo-show .item_verso_musica'), function () {
          $(this).removeClass('ativo');
          if (index === proximo) {
              $(this).addClass('ativo');
              $(this).trigger('click');
          }
          index++;
      })
    }
  }
  if(e.which == KEY_UP || e.keyCode == KEY_UP || e.which == KEY_DOWN || e.keyCode == KEY_DOWN){
    if(!$('#busca_musica').is(':focus') || $('#busca_musica').val()==''){
      //percorre todo sequencia atual
      let proximo = 1;
      let index = 1;
      $("#busca_biblia").blur();
      $.each($('.versiculo'), function () {
        if($(this).hasClass('ativo')) {
          switch (e.keyCode) {
            case KEY_DOWN:
              proximo += index;
              break;
            case KEY_UP:
              proximo = index - 1;
              break;
          }
        }
        index++;
      });
      index = 1;
      // VERIFICA SE O RETORNO É MAIOR QUE O NUMERO TOTAL DE DIVS E RETORNA FALSO PARA A NAVEGACAO NÃO SAIR DE DAS DIVS
      if(proximo > $('.versiculo').length) {
          return false;
      // VERIFICA SE O RETORNO É MENOR QUE 1 E RETORNA FALSO PARA A NAVEGAÇÃO NÃO SAIR DAS DIVS
      }else if(proximo < 1 ) {
          return false;
      }
      // PERCORRE TODAS AS DIVS ITEMS PARA ATRIBUIR A CLASSE SELECTED NA DIV QUE O CURSOR DEVE IR SETADO NA VARIAVEL PROXIMO
      $.each($('.versiculo'), function () {
          $(this).removeClass('ativo');
          if (index === proximo) {
              $(this).addClass('ativo');
              $(this).trigger('click');
          }
          index++;
      })
    }
  }
});
/*
// A flag to know when start or stop the camera
var enabled = false;
// Use require to add webcamjs
var WebCamera = require("webcamjs");
function start_cam(){
  console.log('acao start cam: '+enabled);
  if(!enabled){ // Start the camera !
    enabled = true;
    WebCamera.attach('#camdemo');
    console.log("The camera has been started");
  }else{ // Disable the camera !
    enabled = false;
    WebCamera.reset();
   console.log("The camera has been disabled");
  }
}
*/

/*
div editavel
<p contenteditable="true">This is an editable paragraph.</p>
*/
/*
Verificar se um item tem foco
$(this).is(':focus');
*/
