module.exports = app => {
  var sqlite3 = require('better-sqlite3');
  const config = require('../config');
  
  var db = new sqlite3(config.homedir+'/livepraise/dsw.bd');
  app.get('/display', (req, res) => {
    rows=db.prepare("SELECT * FROM tela").all();
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  app.get('/display/:tipo/:largura/:altura', (req, res) => {
    tipo= req.params.tipo;
    largura= req.params.largura;
    altura= req.params.altura;
    up=db.prepare("UPDATE tela SET tipo= ? ,largura= ? ,altura= ?")
    up.run(tipo,largura,altura)
    rows=db.prepare("SELECT * FROM tela").all();
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  
}