module.exports = app => {
  var sqlite3 = require('sqlite3').verbose();
  const config = require('../config');
  
  var db = new sqlite3.Database(config.homedir+'/livepraise/dsw.bd');
  app.get('/display', (req, res) => {
    sql="SELECT * FROM tela";
    db.all(sql, [], (err, rows) => {
        if (err) {
          res.status(400).json({
              "status":"erro",
              "erro":err.message
            });
          return;
        }
        res.json({
            "status":"successo",
            "data":rows
        })
    });
  })
  app.get('/display/:tipo/:largura/:altura', (req, res) => {
    tipo= req.params.tipo;
    largura= req.params.largura;
    altura= req.params.altura;
    sql=`UPDATE tela SET tipo='${tipo}',largura='${largura}',altura='${altura}'`;
    db.run(sql, [], (err, rows) => {
        if (err) {
          res.status(400).json({
              "status":"erro",
              "erro":err.message
            });
          return;
        }
        res.json({
            "status":"successo",
            "data":rows
        })
    });
  })
  
}