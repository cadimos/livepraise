module.exports = app => {
  var sqlite3 = require('sqlite3').verbose();
  const config = require('../config');  
  var db = new sqlite3.Database(config.dir_app+'/dsw.db');
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
}


/*


//Busca Musica


function buscaMusicaOnline(){
  busca=$("#busca_musica").val();
  if(busca.length<3){
    lista_musica();
  }else{
    $('#list_music').html('');
    let modelo_web=`<div class="panel panel-default">
	  <div class="panel-heading" role="tab" id="head[id_musica]">
	  <h4 class="panel-title">
	  <a role="button" data-toggle="collapse" data-parent="#list_music" href="#collapse[id_musica]" aria-expanded="true" aria-controls="collapseOne">
	  [nome_musica] ([artista_musica])
	  </a>
	  <span class="acoes_item">
	    <a href="javascript:void(0);" onclick='adicionar_musica_salvar("[id_musica]","[nome_musica]","[artista_musica]","[compositor_musica]")'><i class="fas fa-check-circle"></i></a>
	  </span>
	  </h4>
	  </div>
	  <div id="collapse[id_musica]" class="panel-collapse collapse" role="tabpanel" aria-labelledby="head[id_musica]">
	  <div class="panel-body">
	  <ul id="verso[id_musica]"></ul>
	  </div>
	  </div>
    </div>`;
    $('#list_music').append('<div class="alert alert-info" role="alert" id="alerta_pesquisa_musica">Procurando Música na Internet</div>');
    $.ajax({
      type: "GET",
      url: "https://api.livepraise.tk/busca/musicas/"+encodeURI(busca),
      dataType: "json",
      error: function(erro){
        $('#alerta_pesquisa_musica').remove();
        $('#list_music').append('<div class="alert alert-danger" role="alert" id="alerta_erro_musica">Houve um erro ao Buscar a música na internet. Verifique sua conexão e tente novamente!</div>');
        $('#alerta_erro_musica').fadeOut(10000,function(){
          $(this).remove();
        });
      },
      success: function(data) {
        $('#alerta_pesquisa_musica').remove();
        $('#list_music').append('<div class="alert alert-success" role="alert" id="alerta_sucesso_musica">Localizado Músicas na Internet</div>');
        $('#alerta_sucesso_musica').fadeOut(2000,function(){
          $(this).remove();
        });
      	t_resultado=data.resultado.length;
        for(i=0;i<t_resultado;i++){
          result=data.resultado[i];
          item=modelo_web.replace(/\[id_musica\]/g,'api'+result.id);
          item=item.replace(/\[nome_musica\]/g,result.nome);
          item=item.replace(/\[artista_musica\]/g,result.artista.trim());
          item=item.replace(/\[compositor_musica\]/g,result.compositor.trim());
          $('#list_music').append(item);
          t_verso=result.versos.length;
          for(v=0;v<t_verso;v++){
            verse=result.versos[v];
            verse=verse.replace(/<br \/>/g,"\n");
            let modelo_item=`<li class="verso_musica" onclick='viewMusica("verso_api${result.id}_${v}","${result.nome} (${result.artista})","BR");' id="verso_api${result.id}_${v}">${verse}</li>`;
	          $('#verso'+'api'+result.id).append(modelo_item);
          }
        }
      }
    });
  }
}



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