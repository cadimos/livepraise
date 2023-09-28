require('dotenv').config() //Carrega as Variaveis de ambiente
const express = require('express') //Modulo do servidor
const consign = require('consign') //Modulos para carregamento dinamico

const app = express(); //Indico o uso do express como servidor

//Carrego tudo presente na pasta modulos e middlewares, em casos de erros no carregamento a mensagem é exibida em pt-br
consign({
    cwd: __dirname,
    verbose: process.env.APP_DEBUG === 'true' || false,
    locale: 'pt-br'
}).include('middlewares/globals').then('modulos').into(app);

app.use('/',express.static(__dirname+'/tema/default'));

app.listen(process.env.APP_PORT || 3000, () => {
    console.log('Servidor rodando!')
})