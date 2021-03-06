module.exports = app => {
  var sqlite3 = require('better-sqlite3');
  const config = require('../config');  
  //Listo as Versoes de biblias instaladas
  app.get('/categoria/biblia', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', 'Origin');
      var db = new sqlite3(config.homedir+'/livepraise/dsw.bd');
      rows=db.prepare("SELECT * FROM cat_biblia").all();
      res.json({
              "status":"successo",
              "data":rows
      })
  })
  //Listo os livros da Biblia
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
  //Listo os capitulos do Livro
  app.get('/capitulo/biblia/:biblia/:livro', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    livro= req.params.livro;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    rows=db.prepare("SELECT * FROM livros WHERE  id = ?").all(livro);
    res.json({
            "status":"successo",
            "data":rows
    })
  })
  //Listo os versiculos
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
  //faco a busca do livro
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
      rows=db.prepare("SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ?").all(livro,livro);
    }else{
      livro=livro+'%';
      rows=db.prepare("SELECT id FROM livros WHERE `nome` LIKE ? OR `nome2` LIKE ?").all(livro,livro);
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
