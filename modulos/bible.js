module.exports = app => {
  var sqlite3 = require('sqlite3').verbose();
  const config = require('../config');
  var db = new sqlite3.Database(config.dir_app+'/dsw.db');
  app.get('/categoria/biblia', (req, res) => {
      sql="SELECT id,nome FROM cat_biblia";
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
  app.get('/livros/biblia', (req, res) => {
    sql="SELECT id,nome FROM biblia_livros";
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
    biblia= req.params.biblia;
    livro= req.params.livro;
    sql="SELECT DISTINCT capitulo FROM biblia_versiculos WHERE  cat ="+biblia+" AND  livro ="+livro+";"
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
  app.get('/versiculo/biblia/:biblia/:livro/:capitulo', (req, res) => {
    biblia= req.params.biblia;
    livro= req.params.livro;
    capitulo= req.params.capitulo;
    sql="SELECT id,texto,versiculo FROM biblia_versiculos WHERE  cat ="+biblia+" AND  livro ="+livro+" AND capitulo="+capitulo+";"
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
const fs = require('graceful-fs');
const exec = require('child-process-promise').exec;
var request = require('request');//Teste
const si = require('systeminformation');
var md5 = require("blueimp-md5");
var ffmpeg = require('ffmpeg-static');
*/

// Busco na biblia
function buscaBiblia(){
  texto=$('#busca_biblia').val();
  if(texto.length>1){
    n=texto.substr(0,1);
    n=n.match(/\d/g);
    str=texto.split(' ');
    if(n && str.length>1){
      livro=str[0]+' '+str[1];
      if(str.length>2){
        ref=str[2];
      }else{
        ref='';
      }
    }else{
      livro=str[0];
      if(str.length>1){
        ref=str[1];
      }else{
        ref='';
      }
    }
    att_livro=$('#collapse_biblia_'+IDLivro(livro)+'.in').length;
    if(!att_livro){
      att_livro='false';
    }
    if(att_livro=='false'){
      $('#head_biblia_'+IDLivro(livro)+' a').trigger('click');
      let ancora="#collapse_biblia_"+IDLivro(livro);
      location.href=ancora;
      $('#busca_biblia').focus();
    }
    if(ref!=''){
      if(ref.indexOf(":")>0){
        i=ref.split(':');
        capitulo=i[0];
        if(i.length>1){
          versiculo=i[1];
        }else{
          versiculo='';
        }
      }else{
        capitulo=ref;
        versiculo='';
      }
      capitulo=capitulo.replace(/[^\d]+/g,'');
      att_cap=$('#collapse_'+IDLivro(livro)+'_'+capitulo+'.in').length;
      if(!att_cap){
        att_cap='false';
      }
      if(att_cap=='false'){
        $('#head_'+IDLivro(livro)+'_'+capitulo+' a').trigger('click');
        let ancora="#collapse_biblia_"+IDLivro(livro)+'_'+capitulo;
        location.href=ancora;
        $('#busca_biblia').focus();
      }
      versiculo=versiculo.replace(/[^\d]+/g,'');
      if(versiculo.length>0){
        LimpaBiblia();
        att_ver=$('#versiculo_'+capitulo+'_'+versiculo).length;
        if(!att_ver){
          att_ver='false';
        }
        if($('#versiculo_'+capitulo+'_'+versiculo).length){
          $('#versiculo_'+capitulo+'_'+versiculo).trigger('click');
          $('#versiculo_'+capitulo+'_'+versiculo).trigger('focus');
          let ancora='#versiculo_'+capitulo+'_'+versiculo;
          location.href=ancora;
          $('#busca_biblia').focus();
        }
      }
    }
  }
}
var idLivro='';
function SetIDLivro(id){
  if(id){
    idLivro=id;
  }else{
    return idLivro;
  }
}
function IDLivro(str){
  SetIDLivro(0);
  db.serialize(function() {
    db.each("SELECT id FROM biblia_livros WHERE `nome` LIKE '"+str+"%' OR `nome2` LIKE '"+str+"%' LIMIT 1", function(err, result) {
      SetIDLivro(result.id);
    });
  });
  return SetIDLivro();
}
