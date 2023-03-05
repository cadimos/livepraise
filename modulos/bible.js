module.exports = app => {
  var sqlite3 = require('better-sqlite3');
  const config = require('../config');  
  const fs = require('graceful-fs');
  /*
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
  */
 //Listar todas as biblias do projeto, presentes no diretorio https://github.com/damarals/biblias
  app.get('/lista/biblias', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
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
    }
    res.json({
        "status":"successo",
        "biblias": items
    })
  })
  //Listo os livros da Biblia
  app.get('/livros/biblia/:biblia', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    biblia= req.params.biblia;
    var db = new sqlite3(config.homedir+'/livepraise/biblias/'+biblia);
    rows=db.prepare("SELECT id,name as nome FROM book").all();
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
    rows=db.prepare("SELECT COUNT(DISTINCT(chapter)) as capitulos FROM verse WHERE book_id = ?").all(livro);
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
    rows=db.prepare("SELECT id,text as texto,verse as versiculo FROM verse WHERE  book_id = ? AND chapter= ?").all(livro,capitulo);
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
