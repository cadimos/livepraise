
function loanding(){
	/*
	db.serialize(function() {
    db.each("SELECT url,diretorio,inicial FROM background_rapido WHERE `inicial`='S' ORDER BY id ASC", function(err, res) {
      if(res.diretorio=='/'){
        dir=dir_app+'/';
      }else{
        dir=res.diretorio;
			}
			background(dir+res.url);
    });
    $('#current_loading').html('Background Rápido');
	});
	ajustarTela();
	*/
}

//loanding();

function background(vl){
	$('#video').css('display','none');
	$('#fundo img').css('display','block');
	$("#fundo img").fadeOut(150, function() {
		$("#fundo img").attr('src',vl);
		$('#fundo img').css('display','block');
	}).fadeIn(200);
	if($('#player').length){
		let player = document.getElementById("player");
    player.pause();
	}
}

function video(vl){
	$('#fundo img').css('display','none');
	$('#video').css('display','block');
	$('#video').html('');
  $('#video').append('<video id="player" controls loop="true" autoplay><source src="'+vl+'" type="video/mp4"></video>');
  let player = document.getElementById("player");
  setTimeout(() => player.play(),200);
	if($('#player').length){
		let player = document.getElementById("player");
    player.play();
	}
}

function texto(vl){
	$('.conteudo').append('<span>'+vl+'</span>');
	$('.conteudo').textfill({
		maxFontPixels: -1
		});
	$('.conteudo').css('text-align','center');
}
function viewMusica(vl){
	$('.conteudo').html('');
	$('.conteudo').append(vl);
	$('.content').textfill({maxFontPixels: -1});
	$('.content').css('text-align','center');
	$('.rodape').css('font-size','35px');
}

function viewBiblia(vl){
	$('.conteudo').html('');
	$('.conteudo').append(vl);
	$('.content').textfill({maxFontPixels: CalculaLinhas(5,'.content')});
	$('.content').css('text-align','left');
	$('.titulo').css('font-size','35px');
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
function ajustarTela(largura,altura){
	screenWidth = screen.width;
  	screenHeight = screen.height;
	if(!altura){
		if(!largura){
			db.serialize(function() {
				db.each("SELECT tipo,largura,altura FROM tela", function(err, res) {
					if(res.tipo=='16:9' || res.tipo=='4:3' || res.tipo=='7:3'|| res.tipo=='5:3'|| res.tipo=='13:7' || res.tipo=='padrao'){
						ajustarTela(res.tipo);
					}else{
						ajustarTela(res.largura,res.altura);
					}
				});
			});
			console.log('Recarrega Ajustar Tela');
		}else if(largura.indexOf(':')<0){
			new_altura=screenHeight;
			$('#fundo').css('height',new_altura+'px');
			$('#fundo img').css('height',new_altura+'px');
			$('#video').css('height',new_altura+'px');
			$('#fundo video').css('height',new_altura+'px');
			$('.conteudo').css('height',new_altura+'px');
			console.log('Padrão');
		}else{
			dimensao=largura.split(':');
			frm_inicio=dimensao[0];
			frm_fim=dimensao[1];
			new_altura=(screenWidth*frm_fim)/frm_inicio;
			$('#fundo').css('height',new_altura+'px');
			$('#fundo img').css('height',new_altura+'px');
			$('#video').css('height',new_altura+'px');
			$('#fundo video').css('height',new_altura+'px');
			$('.conteudo').css('height',new_altura+'px');
			console.log(frm_inicio+':'+frm_fim);
		}
	}else{
			$('#fundo').css('height',altura+'px');
			$('#fundo img').css('height',altura+'px');
			$('#video').css('height',altura+'px');
			$('#fundo video').css('height',altura+'px');
			$('.conteudo').css('height',altura+'px');

			$('#fundo').css('width',largura+'px');
			$('#fundo img').css('width',largura+'px');
			$('#video').css('width',largura+'px');
			$('#fundo video').css('width',largura+'px');
			$('.conteudo').css('width',largura+'px');
			console.log('Definido pelo Usuario');
	}
	$('.content').textfill({maxFontPixels: -1});
}

$(document).ready(function(){
    //conecto no socket
	var socket = io.connect("http://localhost:3000");
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
				atualizar();
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
})