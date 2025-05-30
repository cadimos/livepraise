const { verificarEstrutura } = require('./utils/fileManager');

(async () => {
    try {
        await verificarEstrutura();

        const express = require('express');
        const consign = require('consign');
        const path = require('path');
        const config = require('./config');
        const compression = require('compression');
        const helmet = require('helmet');
        const jwt = require('./services/jwt');

        const app = express();

        // Configurações básicas do Express
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Configurações de segurança
        app.use(helmet());

        // Compressão de respostas
        app.use(compression());

        // Cache de recursos estáticos
        const cacheTime = 1000 * 60 * 60 * 24; // 24 horas
        app.use('/', express.static(path.join(__dirname, '../frontend/assets/tema/default'), {
            maxAge: cacheTime
        }));
        app.use('/imagens', express.static(config.media.images.path, {
            maxAge: cacheTime
        }));
        app.use('/videos', express.static(config.media.videos.path, {
            maxAge: cacheTime
        }));

        // Rotas públicas explícitas
        app.get('/splash.html', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/assets/tema/default/splash.html'));
        });
        app.get('/monitor.html', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/assets/tema/default/monitor.html'));
        });
        app.get('/projetor.html', (req, res) => {
            res.sendFile(path.join(__dirname, '../frontend/assets/tema/default/projetor.html'));
        });

        // Middleware de autenticação (apenas para rotas /api)
        const authMiddleware = (req, res, next) => {
            if (!req.headers || !req.headers.authorization) {
                return res.status(401).json({
                    error: 'Token não fornecido'
                });
            }
            const { authorization } = req.headers;
            if (!jwt.validaToken(authorization)) {
                return res.status(401).json({
                    error: 'Token inválido'
                });
            }
            next();
        };
        app.use('/api', authMiddleware);

        // Inicio o servidor Socket 
        const http = require('http').Server(app);
        const io = require('socket.io')(http, {
            cookie: false,
            allowEIO3: true
        });

        let clients = {};

        // Conexão
        io.on("connection", function (client) {
            client.on("join", function(name) {
                clients[client.id] = name;
                client.emit("update", "You have connected to the server.");
                client.broadcast.emit("update", name + " has joined the server.");
            });

            client.on("send", function(msg) {
                const mensagem = encodeURI(msg);
                client.broadcast.emit("chat", clients[client.id], mensagem);
            });

            client.on("disconnect", function() {
                io.emit("update", clients[client.id] + " has left the server.");
                delete clients[client.id];
            });
        });

        // Carrego tudo presente na pasta controllers
        consign({
            cwd: __dirname,
            verbose: config.server.debug,
            locale: 'pt-br',
            extensions: ['.js'],
            recursive: true
        }).include('controllers').into(app);

        // Tratamento de erros
        app.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({
                error: 'Erro interno do servidor'
            });
        });

        http.listen(config.server.port, config.server.host, () => {
            console.log(`Servidor rodando em http://${config.server.host}:${config.server.port}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
})();