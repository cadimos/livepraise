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
			switch(fn){
				case 'background':
				$('#video').css('display','none');
  				$('#fundo img').css('display','block');
				$("#fundo img").fadeOut(150, function() {
					$("#fundo img").attr('src',vl);
					$('#fundo img').css('display','block');
				}).fadeIn(200);
				break;
				case 'texto':
				vl=atob(vl);
				$('.texto span').html(vl);
				$('.texto').textfill({
					maxFontPixels: -1
				  });
				$('.texto').css('text-align','center');
				break;
				case 'video':
				$('#fundo img').css('display','none');
				$('#video').css('display','block');
				$('#player').append('<source src="'+vl+'" type="video/mp4">');
				player = document.getElementById("player");
				player.play();
				break;
				case 'removeConteudo':
				$('.texto span').html('');
				break;
			}
    	}
    });
})