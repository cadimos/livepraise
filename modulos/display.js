module.exports = app => {
}
/*
const dir_app = process.cwd();
const fs = require('graceful-fs');
const exec = require('child-process-promise').exec;
var request = require('request');//Teste
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dir_app+'/dsw.db');
const si = require('systeminformation');
var md5 = require("blueimp-md5");
var ffmpeg = require('ffmpeg-static');
*/

//Marca o tipo de tela de projecao atual
function lista_tela(){
  db.serialize(function() {
    db.each("SELECT tipo,largura,altura FROM tela", function(err, res) {
      $('#tamanho_tela').val(res.tipo);
    });
  });
}

//Ajustar tela
function ajustarTela(hide){
  tm=$('#conf_tela #tamanho_tela').val();
  lg=$('#conf_tela #largura').val();
  at=$('#conf_tela #altura').val();
  db.serialize(function() {
    db.run("UPDATE `tela` SET `tipo`='"+tm+"',`largura`='"+lg+"',`altura`='"+at+"'");
  });
  if(tm=='personalizado'){
    vl=btoa(lg+'x'+at)
    var text = '{"funcao":[' +
  '{"nome":"ajustarTela","valor":"'+vl+'" }]}';
  }else{
    var text = '{"funcao":[' +
  '{"nome":"ajustarTela","valor":"'+btoa(tm)+'" }]}';
  }
  socket.emit("send", text);
  if(hide){
    $('#conf_tela').modal('hide');
  }
}