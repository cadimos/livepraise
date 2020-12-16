module.exports = app => {
    var sqlite3 = require('sqlite3').verbose();
    const config = require('../config');
    
    var db = new sqlite3.Database(config.homedir+'/livepraise/dsw.bd');
    app.get('/background-rapido', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        sql="SELECT url,diretorio,inicial FROM background_rapido ORDER BY id ASC";
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
    
}