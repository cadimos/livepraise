module.exports = app => {
    const dir_app = process.cwd();
    var sqlite3 = require('sqlite3').verbose();
    var db = new sqlite3.Database(dir_app+'/dsw.db');
    app.get('/background-rapido', (req, res) => {
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