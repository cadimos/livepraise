// file deepcode ignore DOMXSS: Funcoes
function texto(vl){
	vl=decodeURI(vl);
	$('.conteudo').append('<span>'+vl+'</span>');
	$('.conteudo').textfill({
		maxFontPixels: -1
		});
	$('.conteudo').css('text-align','center');
}
function viewMusica(vl){
	vl=decodeURI(vl);
	$('.conteudo').html('');
	$('.conteudo').append(vl);
	$('.content').textfill();
	$('.content').css('text-align','center');
	$('.rodape').css('font-size','35px');
	$('.titulo').css('display','none');
}

function viewBiblia(vl){
	vl=decodeURI(vl);
	$('.conteudo').html('');
	$('.conteudo').append(vl);
	$('.content').textfill();
	$('.content').css('text-align','left');
	$('.titulo').css('font-size','30px');
	$('.rodape').css('display','none');
}

function removeConteudo(){
	$('.conteudo').html('');
}

function atualizar(){
	location.reload();
}
function CalculaLinhas(quant,div){
  let largura=$(div).innerWidth();
  let altura=$(div).innerHeight();
  carcteres_linha=50;
  font=((altura/quant)-(largura/carcteres_linha))-quant;
  return font;
}
function background(vl){
	vl=decodeURI(vl);
	vl=vl.split("Dados");
	vl='Dados'+vl[1];
	console.log(vl);
}

$(document).ready(function(){
    //conecto no socket
    var url=document.URL.replace('/projetor.html','');
	var socket = io.connect(url);
	socket.emit("join", 'Projetor');
	//Habilito leitura
  ready = true;

	socket.on("chat", function(client,msg) {
		if (ready) {
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
		}
	});
})
