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
    //let listMus=lista_musica();

    if(img){
        $('#current_loading').html('Carregando Vídeos');
    }
    if(vid){
        $('#current_loading').html('Carregando Músicas');
    }
    if(mus){
        $('#current_loading').html('Listando Músicas');
    }
    if(
        img==true &&
        vid==true &&
        mus==true 
    ){
        parar_cor();
        fechar_loandig();
    }
    /*
    
    $('#current_loading').html('Carregando Biblias');
    catBiblias();
    $('#current_loading').html('Listando livros da Biblias');
    setTimeout(() => lista_biblia(),200);
    lista_background_rapido();
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
catImagens();
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
                    $('#preview-imagens').append('<li><img src="'+urlSocket+'/'+img+'" onclick="background(\''+btoa(img)+'\')"></li>')
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
      <h4 class="mb-0">
        <button class="btn btn-link" type="button" data-toggle="collapse" data-target="#collapse[id_musica]" aria-expanded="true" aria-controls="collapse[id_musica]">
            [nome_musica] ([artista_musica])
        </button>
        <span class="acoes_item">
          <a href="javascript:void(0);" data-toggle="modal" data-target="#new_music" data-whatever="[id_musica]"><i class="fas fa-edit"></i></a>
          <a href="javascript:void(0);" onclick="adicionar_musica('[id_musica]')"><i class="fas fa-check-circle"></i></a>
          <a href="javascript:void(0);" onclick="remover_musica('[id_musica]')"><i class="fas fa-trash"></i></a>
        </span>
      </h4>
    </div>

    <div id="collapse[id_musica]" class="collapse" aria-labelledby="collapse[id_musica]" data-parent="#list_music">
      <div class="card-body">
        <ul id="verso[id_musica]"></ul>
      </div>
    </div>
  </div>`;
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