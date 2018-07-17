$(document).ready(function(){
    //conecto no socket
	var socket = io.connect("http://localhost:3000");
	//Habilito leitura
    ready = true;
    socket.on("chat", function(client,msg) {
    	if (ready) {
	    	//var time = new Date();
			//$(".chat").append('<li class="other"><div class="msg"><span>' + client + ':</span><p>' + msg + '</p><time>' + time.getHours() + ':' + time.getMinutes() + '</time></div></li>');
			obj = JSON.parse(msg);
			fn=obj.funcao[0].nome;
			vl=obj.funcao[0].valor;
			switch(fn){
				case 'background':
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
				case 'removeConteudo':
				$('.texto span').html('');
				break;
			}
    	}
    });
})