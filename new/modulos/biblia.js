module.exports = app => {
    //Modulos Node.JS
    const sqlite3 = require('better-sqlite3');
    const fs = require('graceful-fs');
    const config = require('../config');
    //Listo todas as biblias
    app.get('/lista/biblias', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        dir=config.homedir+'/livepraise/biblias';
        var files = fs.readdirSync(dir);
        items=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
          }else{
            if(name.indexOf("sqlite") != -1){
              let db = new sqlite3(name);
              rows=db.prepare("SELECT value FROM metadata WHERE `key` LIKE ?").all('copyright');
              let item={
                'nome': rows[0].value,
                'arquivo':name.replace(dir+'/','')
              }
              items.push(item);
            }
          }
        };
        res.json({
            "status":"successo",
            "biblias": items
        });
    });
    //Listo os livros da Biblia
    app.get('/livros/biblia/:biblia', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        biblia= req.params.biblia;
        var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
        rows=db.prepare("SELECT id,name as nome FROM book").all();
        res.json({
                "status":"successo",
                "data":rows
        });
    });
    //Listo os capitulos do Livro
    app.get('/capitulo/biblia/:biblia/:livro', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        biblia= req.params.biblia;
        livro= req.params.livro;
        var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
        rows=db.prepare("SELECT COUNT(DISTINCT(chapter)) as capitulos FROM verse WHERE book_id = ?").all(livro);
        res.json({
                "status":"successo",
                "data":rows
        })
    });
    //Listo os versiculos
    app.get('/versiculo/biblia/:biblia/:livro/:capitulo', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        biblia= req.params.biblia;
        livro= req.params.livro;
        capitulo= req.params.capitulo;
        var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
        rows=db.prepare("SELECT id,text as texto,verse as versiculo FROM verse WHERE  book_id = ? AND chapter= ?").all(livro,capitulo);
        res.json({
                "status":"successo",
                "data":rows
        })
    });
};