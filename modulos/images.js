module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    var sqlite3 = require('sqlite3').verbose();
    app.get('/categoria/imagem', (req, res) => {
        dir=config.dir_app+'/Dados/imagens';
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
            cat.push(name.replace(config.dir_app+'/',''));
          }
        }
        res.json({
            "status":"successo",
            "data":cat
        })
  })
  app.get('/categoria/imagem/:dir', (req, res) => {
    cat= req.params.dir;
    dir=config.dir_app+'/Dados/imagens/'+cat;
    var files = fs.readdirSync(dir);
    cat=[];
    for (var i in files){
      var name = dir + '/' + files[i];
      if (fs.statSync(name).isDirectory()){
      }else{
        cat.push(name.replace(config.dir_app+'/',''));
      }
    }
    res.json({
        "status":"successo",
        "data":cat
    })
  })
}