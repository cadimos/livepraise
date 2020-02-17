module.exports = app => {
    const fs = require('graceful-fs');
    const dir_app = process.cwd();
    var sqlite3 = require('sqlite3').verbose();
    app.get('/categoria/imagem', (req, res) => {
        dir='Dados/imagens';
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
            cat.push(name);
          }
        }
        res.json({
            "status":"successo",
            "data":cat
        })
    })
}

//Lista Imagens
function lista_imagem(dir){
  $('#preview-imagens').html('');
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      //É um diretorio
    }else{
      img=name;
      img=img.replace('#','%23');
      $('#preview-imagens').append('<li><img src="'+img+'" onclick="background(\''+btoa(img)+'\')"></li>')
    }
  }
  $('#current_loading').html('Carregado Preview de Imagens');
}