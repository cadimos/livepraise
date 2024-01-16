let urlSocket = document.documentURI.split('//');
if (urlSocket[0] == 'file:') {
	urlSocket = 'http://localhost:3000';
	user = 'Monitor';
} else {
	endereco = urlSocket[1].split('/');
	urlSocket = urlSocket[0] + '//' + endereco[0];
	user = 'Monitor_Remoto';
}
var socket = io.connect(urlSocket);

socket.emit("join", 'Projetor');
//Habilito leitura
ready = true;

socket.on("chat", function (client, msg) {
	if (ready) {
		msg = JSON.parse(decodeURI(msg));
		console.log('Cliente:', client);
		console.log('Mensagem:',msg);
		let acao=msg.acao;
		let vl= atob(msg.valor);
		switch (acao) {
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
				v = vl.indexOf('x');
				if (v < 0) {
					ajustarTela(vl);
				} else {
					medidas = vl.split('x');
					w = medidas[0];
					h = medidas[1];
					ajustarTela(w, h);
				}
				break;
		}
	}
});

function loanding() {
	$.ajax({
		type: "GET",
		url: urlSocket + '/background-rapido',
		dataType: "json",
		success: function (data) {
			if (data.status == 'successo') {
				t_rows = data.data.length;
				result = data.data;
				for (i = 0; i < t_rows; i++) {
					inicial = result[i].inicial;
					if (result[i].url.indexOf("base64") > 0) {
						url_img = result[i].url;
					} else {
						url_img = urlSocket + '/' + result[i].url;
					}
					if (inicial == 'S') {
						background(url_img);
					}
				}
			}
		}
	});
	ajustarTela();
	return true;
}

loanding();

function background(vl) {
	vl = decodeURI(vl);
	$('#video').css('display', 'none');
	$('#fundo img').css('display', 'block');
	$("#fundo img").fadeOut(150, function () {
		$("#fundo img").attr('src', vl);
		$('#fundo img').css('display', 'block');
	}).fadeIn(200);
	if ($('#player').length) {
		let player = document.getElementById("player");
		player.pause();
	}
}

function video(vl) {
	vl = decodeURI(vl);
	$('#fundo img').css('display', 'none');
	$('#video').css('display', 'block');
	$('#video').html('');
	$('#video').append('<video id="player" controls loop="true" autoplay><source src="' + vl + '" type="video/mp4"></video>');
	let player = document.getElementById("player");
	setTimeout(() => player.play(), 200);
	if ($('#player').length) {
		let player = document.getElementById("player");
		player.play();
	}
}

function texto(vl) {
	cont = decodeURI(vl);
	$('.conteudo').append('<span>' + cont + '</span>');
	$('.conteudo').textfill({
		maxFontPixels: -1
	});
	$('.conteudo').css('text-align', 'center');
}
function viewMusica(vl) {
	vl = decodeURIComponent(escape(vl))
	$('.conteudo').html('');
	$('.conteudo').append(vl);
	$('.content').textfill({ maxFontPixels: -1 });
	$('.content').css('text-align', 'center');
	$('.rodape').css('font-size', '35px');
}

function viewBiblia(vl) {
	cont = decodeURIComponent(escape(vl));
	$('.conteudo').html('');
	$('.conteudo').append(cont);
	$('.content').textfill({ maxFontPixels: CalculaLinhas(5, '.content') });
	$('.content').css('text-align', 'left');
	$('.titulo').css('font-size', '35px');
}

function removeConteudo() {
	$('.conteudo').html('');
}

function atualizar() {
	location.reload();
}
function CalculaLinhas(quant, div) {
	let largura = $(div).innerWidth();
	let altura = $(div).innerHeight();
	carcteres_linha = 50;
	font = ((altura / quant) - (largura / carcteres_linha)) - quant;
	return font;
}
function ajustarTela(largura, altura) {
	screenWidth = screen.width;
	screenHeight = screen.height;
	if (!altura) {
		if (!largura) {
			$.ajax({
				type: "GET",
				url: urlSocket + '/display',
				dataType: "json",
				success: function (data) {
					if (data.status == 'successo') {
						t_rows = data.data.length;
						result = data.data;
						for (i = 0; i < t_rows; i++) {
							if (i == 0) {
								tipo = result[i].tipo;
								largura = result[i].largura;
								altura = result[i].altura;
								if (tipo == '16:9' || tipo == '4:3' || tipo == '7:3' || tipo == '5:3' || tipo == '13:7' || tipo == 'padrao') {
									ajustarTela(tipo);
								} else {
									ajustarTela(largura, altura);
								}
							}
						}
					}
				}
			});
		} else if (largura.indexOf(':') < 0) {
			new_altura = screenHeight;
			$('#fundo').css('height', new_altura + 'px');
			$('#fundo img').css('height', new_altura + 'px');
			$('#video').css('height', new_altura + 'px');
			$('#fundo video').css('height', new_altura + 'px');
			$('.conteudo').css('height', new_altura + 'px');
		} else {
			dimensao = largura.split(':');
			frm_inicio = dimensao[0];
			frm_fim = dimensao[1];
			new_altura = (screenWidth * frm_fim) / frm_inicio;
			//Corrijo altura
			$('#fundo').css('height', new_altura + 'px');
			$('#fundo img').css('height', new_altura + 'px');
			$('#video').css('height', new_altura + 'px');
			$('#fundo video').css('height', new_altura + 'px');
			$('.conteudo').css('height', new_altura + 'px');
			//Fixo largura
			$('#fundo').css('width', screenWidth + 'px');
			$('#fundo img').css('width', screenWidth + 'px');
			$('#video').css('width', screenWidth + 'px');
			$('#fundo video').css('width', screenWidth + 'px');
			$('.conteudo').css('width', screenWidth + 'px');
		}
	} else {
		$('#fundo').css('height', altura + 'px');
		$('#fundo img').css('height', altura + 'px');
		$('#video').css('height', altura + 'px');
		$('#fundo video').css('height', altura + 'px');
		$('.conteudo').css('height', altura + 'px');

		$('#fundo').css('width', largura + 'px');
		$('#fundo img').css('width', largura + 'px');
		$('#video').css('width', largura + 'px');
		$('#fundo video').css('width', largura + 'px');
		$('.conteudo').css('width', largura + 'px');
	}
	$('.content').textfill({ maxFontPixels: -1 });
}