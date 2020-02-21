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
    let img=catImagens();
    let vid=catVideos();

    if(img){
        $('#current_loading').html('Carregando Vídeos');
    }
    if(vid){
        $('#current_loading').html('Carregado Vídeos');
    }
    if(
        img==true &&
        vid==true
    ){
        parar_cor();
        fechar_loandig();
    }
    /*
    
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
/*
Validar se thumb já foi gerada
function checkImgOnline(imageUrl, error, ok){
     var img = new Image();
     img.src = imageUrl;
     console.log(img.height);
     if(img.height>0){
       ok();
     } else {
       error();
     }
}
checkImgOnline('https://www.thiagovespa.com.br/blog/wp-content/uploads/2013/11/back.jpg', function() {alert('Fora do ar!')}, function(){alert('Online')});
*/