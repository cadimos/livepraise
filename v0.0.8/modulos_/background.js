module.exports = app => {
    var sqlite3 = require('better-sqlite3');
    const config = require('../config');    
    var db = new sqlite3(config.homedir+'/livepraise/dsw.bd');
    app.get('/background-rapido', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        rows=db.prepare("SELECT url,diretorio,inicial FROM background_rapido ORDER BY id ASC").all();
        res.json({
                "status":"successo",
                "data":rows
        })
    })
    
}
