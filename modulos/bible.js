module.exports = app => {
  var sqlite3 = require('better-sqlite3');
  const config = require('../config');  
  
  app.get('/categoria/biblia', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', 'Origin');
      var db = new sqlite3(config.homedir+'/livepraise/dsw.bd');
      rows=db.prepare("SELECT * FROM cat_biblia").all();
      res.json({
              "status":"successo",
              "data":rows
      })
  })
  app.get('/livros/biblia/:biblia', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    rows=db.prepare("SELECT id,nome FROM livros").all();
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  app.get('/capitulo/biblia/:biblia/:livro', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    livro= req.params.livro;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    rows=db.prepare("SELECT * FROM livros WHERE  id = ?").get(livro);
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  app.get('/versiculo/biblia/:biblia/:livro/:capitulo', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    livro= req.params.livro;
    capitulo= req.params.capitulo;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    rows=db.prepare("SELECT id,texto,versiculo FROM versiculos WHERE  livro = ? AND capitulo= ?").all(livro,capitulo);
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  
  app.get('/busca/biblia/:biblia/:busca',(req,res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    busca= req.params.busca;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    //  deepcode ignore HTTPSourceWithUncheckedType: busca
    let livro = busca.match(/^([0-3]|[a-z]) *([a-z])*/ig);
    //  deepcode ignore HTTPSourceWithUncheckedType: busca
    texto=busca.replace(livro,'');
//  deepcode ignore GlobalReplacementRegex: busca
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
      rows=db.prepare("SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ?").get(livro,livro);
    }else{
      livro=livro+'%';
      rows=db.prepare("SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ?").get(livro,livro);
    }
    res.json({
      "status":"successo",
      "busca" : busca,
      'livro': rows,
      "capitulo": capitulo,
      "versiculo": versiculo,
    })
  })
  
}
