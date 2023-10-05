require('dotenv').config() //Carrega as Variaveis de ambiente
const express = require('express') //Modulo do servidor
const consign = require('consign') //Modulos para carregamento dinamico

const app = express(); //Indico o uso do express como servidor
const homedir = require('os').homedir();
//Inicio o servidor Socket 
var http = require('http').Server(app);
const io = require('socket.io')(http,{cookie: false, allowEIO3: true});
var clients = {};
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
//Carrego tudo presente na pasta modulos e middlewares, em casos de erros no carregamento a mensagem é exibida em pt-br
consign({
    cwd: __dirname,
    verbose: process.env.APP_DEBUG === 'true' || false,
    locale: 'pt-br'
}).include('middlewares/globals').then('modulos').into(app);

app.use('/',express.static(__dirname+'/tema/default'));
app.use('/imagens',express.static(homedir+'/livepraise/imagens'));
app.use('/videos',express.static(homedir+'/livepraise/videos'));

http.listen(process.env.APP_PORT || 3000, () => {
    console.log('Servidor rodando!')
})