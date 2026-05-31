const jwt = require('../services/jwt');
module.exports = (req, res, next) => {
    const { authorization} = req.headers
    if (authorization) {
        if(authorization.toLowerCase().includes('bearer')){
            if(jwt.validaToken(authorization)){
                return next();
            }
        }
    }
    return res.json({ 
        message: 'Token Invalido!'
    })
}