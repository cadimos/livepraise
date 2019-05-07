var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
app.get('/', function(req, res){
    res.send('Bem Vindo ao Sistema de Projeção!');
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

http.listen(3000, function(){
    console.log('Iniciado servidor!');
});
