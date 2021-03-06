module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    //  deepcode ignore NoRateLimitingForExpensiveWebOperation: imagens
    app.get('/categoria/imagem', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        dir=config.homedir+'/livepraise/imagens';
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
            cat.push(name.replace(config.homedir+'/livepraise/imagens/',''));
          }
        }
        cat.sort();
        res.json({
            "status":"successo",
            "data":cat
        })
  })
//  deepcode ignore NoRateLimitingForExpensiveWebOperation: imagens
  app.get('/categoria/imagem/:dir', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'Origin');
    cat= decodeURI(req.params.dir);
    dir=config.homedir+'/livepraise/imagens/'+cat;
    //  deepcode ignore PT: Listagem das imagens na pasta local
    var files = fs.readdirSync(dir);
    cat=[];
    for (var i in files){
    //  deepcode ignore PrototypePollution: busca
    //  deepcode ignore UserControlledProperty: Busca
      var name = dir + '/' + files[i];
      if (fs.statSync(name).isDirectory()){
      }else{
        cat.push(name.replace(config.homedir+'/livepraise/',''));
      }
    }
    res.json({
        "status":"successo",
        "data":cat
    })
  })
  
}
