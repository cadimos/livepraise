module.exports = app => {
}
/*
const dir_app = process.cwd();
const fs = require('graceful-fs');
const exec = require('child-process-promise').exec;
var request = require('request');//Teste
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(dir_app+'/dsw.db');
var ffmpeg = require('ffmpeg-static');
*/
/*
const si = require('systeminformation');
var md5 = require("blueimp-md5");

function systemItens(){
  idOS='';
  idHD='';
  idRede='';
  si.osInfo().then(os => {
    console.log('OS serial: '+os.serial);
    idOS=os.serial;
  }).catch(error => console.error(error));
  si.blockDevices().then(disco => {
    console.log('Disco serial: '+disco[0].serial);
    idHD=disco[0].serial;
  }).catch(error => console.error(error));
  si.networkInterfaces().then(rede => {
    for(r=0;r<rede.length;r++){
      if(rede[r].mac){
        console.log('Rede Mac: '+rede[r].mac);
        idRede=rede[r].mac;
      }
    }
  }).catch(error => console.error(error));
  //setTimeout(() => chaveSystem(idOS,idHD,idRede),1000);
}
setTimeout(() => systemItens(),30000);

function chaveSystem(os,hd,rede){
  let chave=md5(os+hd+rede);
  db.serialize(function() {
    db.each("SELECT * FROM system", function(err, res) {
      if(os!=res.os){
        if(res.os==0){
          db.run("UPDATE `system` SET `os`='"+os+"'");
        }else{
          console.log('OS Alterado');
        }
      }
      if(hd!=res.hd){
        if(res.hd==0){
          db.run("UPDATE `system` SET `hd`='"+hd+"'");
        }else{
          console.log('HD Alterado');
        }
      }
      if(rede!=res.mac){
        if(res.mac==0){
          db.run("UPDATE `system` SET `mac`='"+rede+"'");
        }else{
          console.log('Rede Alterado');
        }
      }
      if(chave!=res.chave){
        if(res.chave==0){
          db.run("UPDATE `system` SET `chave`='"+chave+"'");
        }else{
          console.log('Chave Alterado');
        }
      }
    });
  });
  msg=`
  OS: ${os}
  HD: ${hd}
  Rede: ${rede}
  Chave: ${chave}
  `;
  console.log(msg);
}
*/