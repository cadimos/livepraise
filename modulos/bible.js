module.exports = app => {
  var sqlite3 = require('sqlite3').verbose();
  const config = require('../config');  
  
  app.get('/categoria/biblia', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      var db = new sqlite3.Database(config.homedir+'/livepraise/dsw.bd');
      sql="SELECT * FROM cat_biblia";
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
  app.get('/livros/biblia/:biblia', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    biblia= req.params.biblia;
    var db = new sqlite3.Database(config.homedir+'/livepraise/biblias/'+biblia);
    sql="SELECT id,nome FROM livros";
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
  app.get('/capitulo/biblia/:biblia/:livro', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    biblia= req.params.biblia;
    livro= req.params.livro;
    var db = new sqlite3.Database(config.homedir+'/livepraise/biblias/'+biblia);
    sql="SELECT * FROM livros WHERE  id = ?";
    db.all(sql, [livro], (err, rows) => {
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
  app.get('/versiculo/biblia/:biblia/:livro/:capitulo', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    biblia= req.params.biblia;
    livro= req.params.livro;
    capitulo= req.params.capitulo;
    var db = new sqlite3.Database(config.homedir+'/livepraise/biblias/'+biblia);
    sql="SELECT id,texto,versiculo FROM versiculos WHERE  livro = ? AND capitulo= ?";
    db.all(sql, [livro, capitulo], (err, rows) => {
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
  
  app.get('/busca/biblia/:biblia/:busca',(req,res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    biblia= req.params.biblia;
    busca= req.params.busca;
    var db = new sqlite3.Database(config.homedir+'/livepraise/biblias/'+biblia);
    
    let livro = busca.match(/^([0-3]|[a-z]) *([a-z])*/ig);
    
    texto=busca.replace(livro,'');
    texto=texto.replace(' ','');
    if(texto.indexOf(":")>0){
      i=texto.split(':');
      capitulo=i[0];
      if(i.length>1){
        versiculo=i[1];
      }else{
        versiculo='';
      }
    }else{
      capitulo=texto;
      versiculo='';
    }
    if(livro=='jo'){
      sql="SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ? LIMIT 1";
    }else{
      livro=livro+'%';
      sql="SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ? LIMIT 1";
    }

    db.all(sql, [livro, livro], (err, rows) => {
      if (err) {
        res.status(400).json({
            "status":"erro",
            "erro":err.message
          });
        return;
      }
      res.json({
        "status":"successo",
        "busca" : busca,
        'livro': rows,
        "capitulo": capitulo,
        "versiculo": versiculo,
      })
    });
  })
  
}
