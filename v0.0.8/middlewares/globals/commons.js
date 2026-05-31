const express = require('express')
const cors = require('cors')
const compression = require('compression')

module.exports = app => {
    app.use(cors()); //Habilito o uso do modulo cors no servidor
    app.use(compression()); //Habilito que todo o conteudo receba compressao antes de ser enviado.
    app.use(express.json()); //Indico que o servidor vai trabalhar com formato JSON
    app.use(express.urlencoded({ extended: false })); //Forço que o conteudo JSON a ser cebido esteja na estrura correta
    app.disable('x-powered-by'); //Desabilito os dados que identifica o servidor, dificuldando a exploração de falhas já conhecidas para a versão x
}