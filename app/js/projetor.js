process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = true;
const dir_app = process.cwd();
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dir_app+'/dsw.db');

function loanding(){
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
}
loanding();
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
	$('#player').html('');
	$('#player').append('<source src="'+vl+'" type="video/mp4">');
	if($('#player').length){
		let player = document.getElementById("player");
    player.play();
	}
}
function texto(vl){
	$('.texto span').html(vl);
	$('.texto').textfill({
		maxFontPixels: -1
		});
	$('.texto').css('text-align','center');
}

function removeConteudo(){
	$('.texto span').html('');
}
function atualizar(){
	location.reload();
}

$(document).ready(function(){
    //conecto no socket
	var socket = io.connect("http://localhost:3000");
	//Habilito leitura
  ready = true;

	socket.on("chat", function(client,msg) {
		if (ready) {
		obj = JSON.parse(msg);
		fn=obj.funcao[0].nome;
		vl=obj.funcao[0].valor;
		vl=atob(vl);
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
		}
		}
	});
})