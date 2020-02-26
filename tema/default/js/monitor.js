var urlSocket=document.URL.replace('/tema/','').replace('/index.html','');
if(urlSocket.indexOf("///")>0){
    urlSocket='http://localhost:3000';
}
var socket = io.connect(urlSocket);
socket.emit("join", 'Monitor');
ready = true;
socket.on("chat", function(client,msg) {
    if (ready) {
        /*
    obj = JSON.parse(msg);
    fn=obj.funcao[0].nome;
    vl=obj.funcao[0].valor;
    vl=atob(vl);
    console.log('Função: '+fn+' e Valor: '+vl);
    switch(fn){
        case 'texto':
            texto(vl);
        break;

        case 'removeConteudo':
            removeConteudo();
        break;

        case 'atualizar':
            atualizar();
        break;

        case 'viewMusica':
            viewMusica(vl);
        break;

        case 'viewBiblia':
            viewBiblia(vl);
        break;

        case 'background':
            background(vl);
        break;
    }
    */
    }
});
//Converte em ISO-8859-1
function iso_encode(str){
    str = str.replace(/\'/g, '&apos;');
    str = str.replace(/\"/g, '&quot;');
    return str;
}
//Remove Quebra de Linha Substituindo por <br />
function nl2br (str) {
    if (typeof str === 'undefined' || str === null) {
      return ''
    }
    var breakTag = `<br />`;
    return (str + '').replace(/(\r\n|\n\r|\r|\n)/g, breakTag)
}
//Calcula quantidade de linhas para biblia
function CalculaLinhas(quant,div){
    let largura=$(div).innerWidth();
    let altura=$(div).innerHeight();
    console.log(largura+'x'+altura);
    carcteres_linha=50;
    font=((altura/quant)-(largura/carcteres_linha))-quant;
    return font;
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
//Atualizar e Regarregar Janelas
function atualizar(vl){
    let txt='ok';
    if(vl!=txt){
      let text = '{"funcao":[' +'{"nome":"atualizar","valor":"'+btoa(txt)+'" }]}';
      socket.emit("send", text);
    }
    setTimeout(() => location.reload(),100);
}
var stop_color=false;
function color_animate(tempo){
    if(stop_color==false){
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
}
function parar_cor(){
    stop_color = true;
    return true;
}
function loanding(){
    $('#current_loading').html('Iniciando Animaçao');
    color_animate(2000);
    $('#current_loading').html('Carregando Imagens');
    let mus=catMusicas();
    let img=catImagens();
    let vid=catVideos();
    let bg=lista_background_rapido();
    let bib=catBiblias();

    if(img){
        $('#current_loading').html('Carregando Vídeos');
    }
    if(vid){
        $('#current_loading').html('Carregando Músicas');
    }
    if(mus){
        $('#current_loading').html('Carregando Biblias');
    }
    if(bib){
        $('#current_loading').html('Carregando Background Rápido');
    }
    if(
        img==true &&
        vid==true &&
        mus==true &&
        bg ==true &&
        bib==true
    ){
        parar_cor();
        //fechar_loandig();
    }
    /*
    
    
    lista_tela();
    */
}
  
function fechar_loandig(){
    $('#loading').css('display','none');
}
  
setTimeout(() => loanding(), 200);
//Lista a Categoria das Imagens
function catImagens(){
    $('#cat_imagens').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/imagem',
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    option=result[i].replace('Dados/imagens/','');
                    $('#cat_imagens').append('<option value="'+option+'">'+option+'</option>');
                    if(i==0){
                        lista_imagem(option);
                    }
                }
            }
        }
    });
    return true;
}
//Lista Imagens
function lista_imagem(dir){
    $('#preview-imagens').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/imagem/'+dir,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){                    
                    img=result[i];
                    img=img.replace('#','%23');
                    url_img=urlSocket+'/'+img
                    $('#preview-imagens').append('<li><img src="'+url_img+'" onclick="background(\''+btoa(url_img)+'\')"></li>')
                }
            }
        }
    });
    return true;
}
//Lista as Categorias de Videos
function catVideos(){
    $('#cat_videos').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/video',
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    option=result[i].replace('Dados/videos/','');
                    $('#cat_videos').append('<option value="'+option+'">'+option+'</option>');
                    if(i==0){
                        lista_video(option);
                    }
                }
            }
        }
    });
    return true;
}
function lista_video(dir){
    $('#preview-videos').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/video/'+dir,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.video.length;
                vid=data.video;
                preview=data.thumb;
                erro=false;
                for(i=0;i<t_rows;i++){                    
                    video=vid[i];
                    thumb=preview[i];
                    $('#preview-videos').append('<li><img id="video'+i+'" src="'+urlSocket+'/'+thumb+'" onclick="viewVideo(\''+btoa(urlSocket+'/'+video)+'\')"></li>');
                }
            }
        }
    });
   return true;
}
//Lista as Categorias de Musicas
function catMusicas(){
    $('#cat_musica').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/musica',
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    option=result[i].nome;
                    id=result[i].id
                    $('#cat_musica').append('<option value="'+id+'">'+option+'</option>');
                }
                lista_musica();
            }
        }
    });
    return true;
}
//Lista as Musicas
function lista_musica(){
    cat=$('#cat_musica').val();
    if(cat!='' && cat!=null){
        $('#list_music').html('');
       let modelo=`
       <div class="card">
      <div class="card-header" id="head[id_musica]">
        <a class="card-link" data-toggle="collapse" href="#musica[id_musica]">
            [nome_musica] ([artista_musica])
        </a>
        <span class="acoes_item">
          <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
          <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
          <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
        </span>
      </div>
      <div id="musica[id_musica]" class="collapse" data-parent="#list_music">
        <div class="card-body">
            <ul id="verso[id_musica]"></ul>
        </div>
      </div>
    </div>
    `;
        $.ajax({
            type: "GET",
            url: urlSocket+'/categoria/musica/'+cat,
            dataType: "json",
            success: function(data) {
                if(data.status=='successo'){
                    t_rows=data.data.length;
                    result=data.data;
                    for(i=0;i<t_rows;i++){
                        musica=result[i];
                        item=modelo.replace(/\[id_musica\]/g,musica.id);
                        item=item.replace(/\[nome_musica\]/g,musica.nome);
                        item=item.replace(/\[artista_musica\]/g,musica.artista);
                        $('#list_music').append(item);
                        lista_musica_verso(musica.id,musica.nome,musica.artista);
                    }
                }
            }
        });
        return true;
    }else{
        setTimeout(() => lista_musica(),200);
    }
}
function lista_musica_verso(id,nome,artista){
    $.ajax({
        type: "GET",
        url: urlSocket+'/musica/verso/'+id,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    row=result[i];
                    verse=row.verso;
                    verse=verse.replace(/<br \/>/g,"\n");
                    modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_${row.musica}_${row.id}","${nome} (${artista})","BR");' id="verso_${row.musica}_${row.id}">${verse}</li>`;
                    $('#verso'+row.musica).append(modelo_item);
                }
            }
        }
    });
    return true;
}
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
      var text = `{"funcao":[{"nome":"viewMusica","valor":"${btoa(modelo)}" }]}`;
      socket.emit("send", text);
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
//Lista as Biblias Disponiveis
function catBiblias(){
    $('#cat_biblia').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/categoria/biblia',
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    option=result[i].nome;
                    id=result[i].url
                    $('#cat_biblia').append('<option value="'+id+'">'+option+'</option>');
                    if(i==0){
                        lista_biblia();
                    }
                }
            }
        }
    });
    return true;
}
//Lista a Biblia Selecionada
function lista_biblia(){
    cat=$('#cat_biblia').val();
   let modelo=`
   <div class="card">
      <div class="card-header">
        <a class="card-link" data-toggle="collapse" href="#biblia_[id_livro]">
            [nome_livro]
        </a>
      </div>
      <div id="biblia_[id_livro]" class="collapse" data-parent="#list_biblia">
        <div class="card-body">
            <div id="list_biblia_[id_livro]"></div>
        </div>
      </div>
    </div>
   `;
    $('#list_biblia').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/livros/biblia/'+cat,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    item=modelo.replace(/\[id_livro\]/g,result[i].id);
                    item=item.replace(/\[nome_livro\]/g,result[i].nome);
                    $('#list_biblia').append(item);
                    lista_capitulos(result[i].id);
                }
            }
        }
    });
    return true;
}
function lista_capitulos(id){
    cat=$('#cat_biblia').val();
    let modelo=`
    <h3>
        <a onclick="lista_versiculo('${cat}',[id_livro],[id_capitulo])">
            <i class="fas fa-bible"></i>  [id_capitulo]
        </a>
    </h3>
    <div id="collapse_[id_livro]_[id_capitulo]">
        <ul id="versiculo"></ul>
    </div>
    `;
    
    $.ajax({
        type: "GET",
        url: urlSocket+'/capitulo/biblia/'+cat+'/'+id,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                  capitulos=result[i].capitulos;
                  for(a=0;a<capitulos;a++){
                        c=a+1;
                        item=modelo.replace(/\[id_livro\]/g,result[i].id);
                        item=item.replace(/\[id_capitulo\]/g,c);
                        $('#list_biblia_'+result[i].id).append(item);
                        $('#current_loading').html('Listando Livros da Biblias: '+result[i].nome+' '+c);
                  }
                  $('#list_biblia_'+result[i].id).accordion({
                    collapsible: true
                  });
                  ultimo=t_rows-1;
                  if(i==ultimo){
                    fechar_loandig();
                  }
                }
            }
        }
    });
    return true;
}
//Funçao de Listar os Versiculos por demanda
function lista_versiculo(cat,livro,capitulo){
    cat_selecionado=$('#cat_biblia').val();
    if(cat!=cat_selecionado){
        cat=cat_selecionado;
    }
    modelo_versiculo=`<a name="versiculo_[id_capitulo]_[id_versiculo]"></a><li onclick="viewBiblia('versiculo_[id_capitulo]_[id_versiculo]','[local_biblia]','BR');" id="versiculo_[id_capitulo]_[id_versiculo]" class="versiculo">[texto]</li>`;
    modelo_versiculo=modelo_versiculo.replace(/\[id_livro\]/g,livro);
    modelo_versiculo=modelo_versiculo.replace(/\[id_capitulo\]/g,capitulo);
    $.ajax({
        type: "GET",
        url: urlSocket+'/versiculo/biblia/'+cat+'/'+livro+'/'+capitulo,
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                $('#collapse_'+livro+'_'+capitulo+' #versiculo').html('');
                for(i=0;i<t_rows;i++){
                    versiculo=modelo_versiculo.replace(/\[id_versiculo\]/g,result[i].versiculo);
                    versiculo=versiculo.replace(/\[texto\]/g,(result[i].texto));
                    versiculo=versiculo.replace(/\[local_biblia\]/g,livro+'-'+capitulo+'-'+result[i].versiculo);
                    $('#collapse_'+livro+'_'+capitulo+' #versiculo').append(versiculo);
                }
            }
        }
    });
}
//Exibir Musica
function viewBiblia(id,nome,br){
    cat=$('#cat_biblia').val();
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
    $.ajax({
        type: "GET",
        url: urlSocket+'/capitulo/biblia/'+cat+'/'+nome[0],
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                $('.titulo').html(result[0].nome+' '+nome[1]+':'+nome[2]);
            }
        }
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
        var text = `{"funcao":[{"nome":"viewBiblia","valor":"${btoa(modelo_send)}" }]}`;
        socket.emit("send", text);
      },200);
    }
  
}
//Listagem Background Rápido
function lista_background_rapido(){
    let modelo=`<div class="col-xs-1 col-sm-1 col-md-1 col-lg-1 background-rapido">
        <a href="javascript:void(0)" onclick="backgroundRapido('[url64]')">
            <img src="[url]" class="img-responsive" alt="Responsive image">
        </a>
      </div>`;
    $('#background-rapido').html('');
    $.ajax({
        type: "GET",
        url: urlSocket+'/background-rapido',
        dataType: "json",
        success: function(data) {
            if(data.status=='successo'){
                t_rows=data.data.length;
                result=data.data;
                for(i=0;i<t_rows;i++){
                    inicial=result[i].inicial;
                    url_img=urlSocket+'/'+result[i].url;
                    if(inicial=='S'){
                        $('#preview img').attr('src',url_img);
                    }
                    item_back=modelo.replace(/\[url\]/g,url_img);
                    item_back=item_back.replace(/\[url64\]/g,btoa(url_img));
                    $('#background-rapido').append(item_back);
                }
            }
        }
    });
   return true;
}
//Troca o Fundo da Tela
function background(url){
    $('#video').css('display','none');
    $('#preview img').css('display','block');
    $("#preview img").fadeOut(150, function() {
        $("#preview img").attr('src',atob(url));
    }).fadeIn(200);
    if(congelar('valida')==true){
        var text = `{"funcao":[{"nome":"background","valor":"${url}" }]}`;
        socket.emit("send", text);
    }
    if($('#player').length){
        let player = document.getElementById("player");
        player.pause();
    }
}
//Visualiza o Video
function viewVideo(url){
    $('#preview img').css('display','none');
    $('#video').css('display','block');
    if(congelar('valida')==true){
      var text = `{"funcao":[{"nome":"video","valor":"${url}" }]}`;
      socket.emit("send", text);
    }
    $('#video').html('');
    $('#video').append('<video id="player" controls loop="true" autoplay><source src="'+atob(url)+'" type="video/mp4"></video>');
    let player = document.getElementById("player");
    setTimeout(() => play_video(),200);
}
function play_video(){
	player.play();
	player.volume=0;
}
// Troca o Fundo Removendo o Texto
function backgroundRapido(url){
    $('#video').css('display','none');
    $('#preview img').css('display','block');
    $("#preview img").fadeOut(150, function() {
        $("#preview img").attr('src',atob(url));
    }).fadeIn(200);
    if(congelar('valida')==true){
      var text = `{"funcao":[{"nome":"background","valor":"${url}" }]}`;
      socket.emit("send", text);
    }
    setTimeout(() => removeConteudo(), 200);
    if($('#player').length){
      let player = document.getElementById("player");
      player.pause();
    }
}


/* Chrome Tabs */
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