const express = require('express')
const cors = require('cors')
const compression = require('compression')

module.exports = app => {
    // Configuração de segurança e CORS
    app.use(cors());
    app.disable('x-powered-by');

    // Configuração de compressão e otimização
    app.use(compression());

    // Configuração de parsing de requisições
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
}