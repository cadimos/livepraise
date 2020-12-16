module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    
    app.get('/categoria/imagem', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
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
  app.get('/categoria/imagem/:dir', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    cat= req.params.dir;
    dir=config.homedir+'/livepraise/imagens/'+cat;
    var files = fs.readdirSync(dir);
    cat=[];
    for (var i in files){
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