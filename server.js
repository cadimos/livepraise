var sqlite3 = require('better-sqlite3');
var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');
var app = require('express')();
//  deepcode ignore HttpToHttps: Execução local dispensa https
var http = require('http').Server(app);
const io = require('socket.io')(http,{cookie: false});
const config = require('./config');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(express.static(__dirname+'/public'));
app.use('/app',express.static(__dirname+'/app'));
app.use('/tema',express.static(__dirname+'/tema/default'));
app.use('/libs',express.static(__dirname+'/node_modules'));
app.use('/imagens',express.static(config.homedir+'/livepraise/imagens'));
app.use('/videos',express.static(config.homedir+'/livepraise/videos'));
app.get('/teste', function(req, res){
    res.send('Bem Vindo ao Sistema de Projeção!<br>'+__dirname+'<br>'+__dirname+'/modulos');
});
var clients = {};
//SocketIO vem aqui
//Conexão
io.on("connection", function (client) {
    //console.log('Usuario Conectado');
    client.on("join", function(name){
    	//console.log("Joined: " + name);
    //  deepcode ignore PrototypePollutionFunctionParams: Comunicacao
      clients[client.id] = name;
      client.emit("update", "You have connected to the server.");
      client.broadcast.emit("update", name + " has joined the server.")
    });

    client.on("send", function(msg){
      mensagem=encodeURI(msg);
    	//console.log("Message: " + msg);
      client.broadcast.emit("chat", clients[client.id], mensagem);
    });
    //Usuario Desconectado
    client.on("disconnect", function(){
    	//console.log("Disconnect "+client.id);
      io.emit("update", clients[client.id] + " has left the server.");
      delete clients[client.id];
    });
});
consign({
  cwd: __dirname
})
  .include('modulos')
  .into(app)
  http.listen(config.port,function(){
  console.log('Sistema usando porta '+config.port);
})
