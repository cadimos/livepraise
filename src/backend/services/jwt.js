require('dotenv').config();
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Gera um token JWT para o usuário
 * @param {string} userId - ID do usuário
 * @returns {string} Token JWT
 * @throws {Error} Se houver erro ao gerar o token
 */
function gerarToken(userId) {
    if (!userId) {
        throw new Error('ID do usuário é obrigatório');
    }

    const timestamp = new Date().getTime();
    const optionsToken = {
        issuer: config.auth.jwt.issuer,
        subject: userId,
        audience: config.auth.jwt.audience,
        expiresIn: config.auth.jwt.expiresIn,
        algorithm: 'HS256',
        iat: timestamp
    };

    try {
        return jwt.sign(optionsToken, config.auth.jwt.secret);
    } catch (error) {
        console.error('Erro ao gerar token:', error);
        throw new Error('Erro ao gerar token de autenticação');
    }
}

/**
 * Valida um token JWT
 * @param {string} token - Token JWT completo (com 'Bearer ')
 * @returns {boolean} true se o token for válido
 */
function validaToken(token) {
    if (!token || !token.includes(' ')) {
        console.error('Token inválido ou ausente');
        return false;
    }

    const tk = token.split(' ')[1];
    
    try {
        const decoded = jwt.verify(tk, config.auth.jwt.secret, {
            issuer: config.auth.jwt.issuer,
            audience: config.auth.jwt.audience,
            algorithms: ['HS256']
        });

        // Verifica se o token não expirou
        if (decoded.exp && decoded.exp < Date.now() / 1000) {
            console.error('Token expirado');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erro ao validar token:', error.message);
        return false;
    }
}

/**
 * Decodifica um token JWT
 * @param {string} token - Token JWT completo (com 'Bearer ')
 * @returns {object|null} Dados do token ou null se inválido
 */
function decodificaToken(token) {
    if (!token || !token.includes(' ')) {
        return null;
    }

    const tk = token.split(' ')[1];
    
    try {
        return jwt.decode(tk);
    } catch (error) {
        console.error('Erro ao decodificar token:', error.message);
        return null;
    }
}

module.exports = {
    gerarToken,
    validaToken,
    decodificaToken
};