$(document).ready(function(){
	//conecto no socket
	var socket = io.connect("http://localhost:3000");
	//Habilito leitura
	ready = true;
	//indico a entrtada
	socket.emit("join", 'Monitor');

	$("#textarea").keypress(function(e){
        if(e.which == 13) {
        	var text = $("#textarea").val();
        	$("#textarea").val('');
        	var time = new Date();
        	$(".chat").append('<li class="self"><div class="msg"><span>' + $("#nickname").val() + ':</span><p>' + text + '</p><time>' + time.getHours() + ':' + time.getMinutes() + '</time></div></li>');
        	socket.emit("send", text);

        }
	});
	
	socket.on("update", function(msg) {
    	if (ready) {
    		$('.chat').append('<li class="info">' + msg + '</li>')
    	}
    }); 

    socket.on("chat", function(client,msg) {
    	if (ready) {
	    	var time = new Date();
	    	$(".chat").append('<li class="other"><div class="msg"><span>' + client + ':</span><p>' + msg + '</p><time>' + time.getHours() + ':' + time.getMinutes() + '</time></div></li>');
    	}
    });
});
function background(img){
    var socket = io.connect("http://localhost:3000");
    var text = '{"funcao":[' +
'{"nome":"background","valor":"'+img+'" }]}';
    socket.emit("send", text);
}