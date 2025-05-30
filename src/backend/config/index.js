require('dotenv').config();
const path = require('path');
const os = require('os');

// Função para obter o diretório do usuário de forma multiplataforma
const getUserHomeDir = () => {
    const homeDir = os.homedir();
    return path.join(homeDir, 'livepraise');
};

const userDir = getUserHomeDir();

const config = {
    // Configurações do Servidor
    server: {
        port: process.env.APP_PORT || 3000,
        host: process.env.APP_HOST || 'localhost',
        debug: process.env.APP_DEBUG === 'true' || false
    },

    // Configurações do Banco de Dados
    database: {
        path: path.join(userDir, 'dsw.bd'),
        backupPath: path.join(userDir, 'backup')
    },

    // Configurações de Autenticação
    auth: {
        jwt: {
            secret: process.env.JWT_PASS || 'livepraise-secret-key',
            issuer: process.env.JWT_ISSUER || 'livepraise',
            audience: process.env.JWT_AUDIENCE || 'livepraise-users',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
    },

    // Configurações de Mídia
    media: {
        images: {
            path: path.join(userDir, 'imagens'),
            allowedTypes: ['jpg', 'jpeg', 'png', 'gif'],
            maxSize: 10 * 1024 * 1024 // 10MB
        },
        videos: {
            path: path.join(userDir, 'videos'),
            allowedTypes: ['mp4', 'avi', 'mkv'],
            maxSize: 100 * 1024 * 1024 // 100MB
        }
    },

    // Configurações de Biblías
    biblias: {
        path: path.join(userDir, 'biblias')
    },

    // Configurações do Electron
    electron: {
        mainWindow: {
            width: 1024,
            height: 768,
            minWidth: 800,
            minHeight: 600
        },
        splashScreen: {
            width: 400,
            height: 200
        }
    },

    // Configurações de Log
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: path.join(userDir, 'logs', 'app.log')
    },

    // Configurações de Tema
    tema: process.env.TEMA || 'default',

    // Configurações de Ambiente
    env: process.env.NODE_ENV || 'development'
};

module.exports = config; 