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
//Lista a Categoria das Imagens
function catImagens(){
    $('#cat_imagens').html();
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
    $('#current_loading').html('Carregado Imagens');
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
    $('#current_loading').html('Carregado Preview de Imagens');
}