var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');
var app = require('express')();
var http = require('http').Server(app);
const io = require('socket.io')(http,{cookie: false});
const config = require('./config');
const fs = require('graceful-fs');
const fileBD= config.homedir+'/dsw.bd';
if (fs.existsSync(fileBD)===false) {
  //Crio o BD, caso não exista
}

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())
app.use(express.static(__dirname+'/public'));
app.use('/app',express.static(__dirname+'/app'));
app.use('/tema',express.static(__dirname+'/tema/default'));
app.use('/node_modules',express.static(__dirname+'/node_modules'));
app.use('/Dados',express.static(config.homedir+'/Dados'));
app.get('/teste', function(req, res){
    res.send('Bem Vindo ao Sistema de Projeção!'+__dirname );
});
var clients = {};
//SocketIO vem aqui
//Conexão
io.on("connection", function (client) {
    //console.log('Usuario Conectado');
    client.on("join", function(name){
    	//console.log("Joined: " + name);
      clients[client.id] = name;
      client.emit("update", "You have connected to the server.");
      client.broadcast.emit("update", name + " has joined the server.")
    });

    client.on("send", function(msg){
    	//console.log("Message: " + msg);
      client.broadcast.emit("chat", clients[client.id], msg);
    });
    //Usuario Desconectado
    client.on("disconnect", function(){
    	//console.log("Disconnect "+client.id);
      io.emit("update", clients[client.id] + " has left the server.");
      delete clients[client.id];
    });
});
consign()
  .include('modulos')
  .into(app)
  http.listen(config.port,function(){
  console.log('Sistema usando porta '+config.port);
})
