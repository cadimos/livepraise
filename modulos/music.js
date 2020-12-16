module.exports = app => {
  var sqlite3 = require('sqlite3').verbose();
  const config = require('../config');  
  
  var db = new sqlite3.Database(config.homedir+'/livepraise/dsw.bd');
  app.get('/categoria/musica', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    sql="SELECT * FROM cat_musicas";
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
  app.get('/categoria/musica/:id', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    id= req.params.id;
    sql="SELECT * FROM musica WHERE cat='"+id+"'";
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
  app.get('/musica/verso/:id', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    id= req.params.id;
    sql="SELECT * FROM musica_versos WHERE musica='"+id+"'";
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
  app.get('/busca/musica/:busca', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    busca= req.params.busca;
    sql=`SELECT DISTINCT(musica.id) as id,nome,nome2,artista,compositor FROM musica INNER JOIN musica_versos ON musica_versos.musica = musica.id WHERE nome2 LIKE '%${busca}%' OR musica_versos.verso LIKE '%${busca}%'`;
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
  app.post("/add/musica/", (req, res, next) => {
    var errors=[]
    if (!req.body.cat){
        errors.push("Categoria Obrigatória");
    }
    if (!req.body.nome){
        errors.push("Nome Obrigatório");
    }
    if (!req.body.artista){
        errors.push("Artista Obrigatório");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        cat: req.body.cat,
        nome: req.body.nome,
        artista : req.body.artista,
        compositor : req.body.compositor
    }
    var sql ='INSERT INTO musica (cat, nome, nome2, artista,compositor) VALUES (?,?,?,?,?)'
    var params =[data.cat, data.nome,data.nome, data.artista,data.compositor]
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({
            "status":"successo",
            "data": data,
            "id" : this.lastID
        })
    });
  })
  app.post("/add/musica/verso", (req, res, next) => {
    var errors=[]
    if (!req.body.musica){
        errors.push("Id da Musica Obrigatória");
    }
    if (!req.body.verso){
        errors.push("Verso Obrigatório");
    }
    if (errors.length){
        res.status(400).json({"error":errors.join(",")});
        return;
    }
    var data = {
        musica: req.body.musica,
        verso: req.body.verso,
    }
    var sql ='INSERT INTO musica_versos (musica, verso) VALUES (?,?)'
    var params =[data.musica, data.verso]
    db.run(sql, params, function (err, result) {
        if (err){
            res.status(400).json({"error": err.message})
            return;
        }
        res.json({
            "status":"successo",
            "data": data,
            "id" : this.lastID
        })
    });
  })
  
}


/*


//Busca Musica






//Salva as Musicas
function salvar_musica(id){
  nome=$('#new_music #nome').val();
  if(nome==''){
    alert('O nome da Música é Obrigatória!');
  }
  nome=iso_encode(nome);
  artista=$('#new_music #artista').val();
  if(artista==''){
    alert('O nome do Artista é Obrigatória!');
  }
  artista=iso_encode(artista);
  compositor=$('#new_music #compositor').val();
  compositor=iso_encode(compositor);
  cat=1;
  letra=$('#new_music #letra').val();
  if(letra==''){
    alert('A letra da Música é Obrigatória!');
  }
  letra=iso_encode(letra);
  if(nome!='' && artista!='' && letra!=''){
    letra=nl2br(letra);
    versos=letra.split("<br /><br />");
    t_versos=versos.length;
    if(id==0){
      db.serialize(function() {
        db.run("INSERT INTO `musica` (`cat`,`nome`,`nome2`,`artista`,`compositor`) VALUES ('"+cat+"','"+nome+"','"+nome+"','"+artista+"','"+compositor+"')");
        db.each("SELECT id FROM musica ORDER BY  id  DESC LIMIT 1", function(err, row) {
          id_musica=row.id;
          for(i=0;i<t_versos;i++){
            if(versos[i]!=''){
              db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
            }
          }
        });
      });
    }else{
      db.serialize(function() {
        db.run("UPDATE `musica` SET `nome`='"+nome+"',`nome2`='"+nome+"',`artista`='"+artista+"',`compositor`='"+compositor+"' WHERE `id`='"+id+"'");
        db.run("DELETE FROM `musica_versos` WHERE `musica`='"+id+"'");
        id_musica=id;
        for(i=0;i<t_versos;i++){
          if(versos[i]!=''){
            db.run("INSERT INTO `musica_versos` (`musica`,`verso`) VALUES ('"+id_musica+"','"+versos[i]+"')")
          }
        }
      });
    }
    $('#new_music #nome').val('');
    $('#new_music #artista').val('');
    $('#new_music #compositor').val('');
    $('#new_music #letra').val('');
    $.alert({
      title: 'Sucesso!',
      content: 'Música salva com sucesso!',
    });
    $('#new_music').modal('hide');
    $('.modal-backdrop').remove();
    lista_musica();
  }
}

//Remover Musica
function remover_musica(id,conf){
  rand=Math.floor(Math.random() * 1000000);
  if(conf!=true){
    $.confirm({
      title: 'Deseja Realmente Remover?',
      content: `<form action="" class="formName">
      <div class="form-group">
      <label>Digite o Código a seguir para Excluir: ${rand}</label>
      <input type="text" placeholder="Código" class="codigo form-control" required />
      </div>
      </form>
      `,
      buttons: {
          formSubmit: {
              text: 'Excluir',
              btnClass: 'btn-red',
              action: function () {
                  var cod = this.$content.find('.codigo').val();
                  if(!cod || cod!=rand){
                      $.alert('Código incorreto! Tente novamente');
                      return false;
                  }else{
                    db.serialize(function() {
                      db.run("DELETE FROM `musica` WHERE `id`='"+id+"'");
                      lista_musica();
                    });
                  }
              }
          },
          cancel: {
            text: 'Cancelar',
            action: function () {}
          }
      },
      onContentReady: function () {
          // bind to events
          var jc = this;
          this.$content.find('form').on('submit', function (e) {
              // if the user submits the form by pressing enter in the field.
              e.preventDefault();
              jc.$$formSubmit.trigger('click'); // reference the button and click it
          });
      }
    });
  }
}
*/