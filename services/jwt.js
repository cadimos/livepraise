require('dotenv').config() //Carrega as Variaveis de ambiente
const jwt = require('jsonwebtoken');
function gerarToken(userId){
    const issuer = process.env.JWT_EMISSOR;
    const subject = userId;
    const audience = process.env.JWT_DESTINATARIO;
    let timestamp=new Date().getTime();
    const optionsToken = {
        issuer: issuer,
        subject: subject,
        audience: audience,
        expiresIn: "1h",
        algorithm: "RS256",
        iat: timestamp,
        exp: timestamp+60
    };
    let token = jwt.sign(optionsToken,process.env.JWT_PASS);
    return token;
}
function validaToken(token){
    let tk = token.split(' ')[1];
    try{
        let v= jwt.verify(tk,process.env.JWT_PASS);
        return true;
    }catch(error){
        return false;
    }
}
module.exports =  {
    gerarToken,
    validaToken
}