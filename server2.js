var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');
var app = require('express')();
var http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 3000;
if(__dirname.indexOf('resources')<0){
  var base=__dirname;
}else{
  var base = '../../'+__dirname;
}
app.use(bodyParser.json())
app.use(express.static(__dirname+'/public'));
app.use('/app',express.static(__dirname+'/app'));
app.use('/node_modules',express.static(__dirname+'/node_modules'));
app.use('/Dados',express.static(base+'/Dados'));
app.get('/teste', function(req, res){
    res.send('Bem Vindo ao Sistema de Projeção!'+__dirname );
});
var clients = {};
//SocketIO vem aqui
//Conexão
io.on("connection", function (client) {
    console.log('Usuario Conectado');
    client.on("join", function(name){
    	console.log("Joined: " + name);
        clients[client.id] = name;
        client.emit("update", "You have connected to the server.");
        client.broadcast.emit("update", name + " has joined the server.")
    });

    client.on("send", function(msg){
    	console.log("Message: " + msg);
        client.broadcast.emit("chat", clients[client.id], msg);
    });
    //Usuario Desconectado
    client.on("disconnect", function(){
    	console.log("Disconnect "+client.id);
        io.emit("update", clients[client.id] + " has left the server.");
        delete clients[client.id];
    });
});
consign()
  .include('modulos')
  .into(app)
app.listen(port, () => {
  console.log(`Servidor rodando na porta: ${port}`)
})
