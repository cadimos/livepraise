module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    const ffmpeg = require('ffmpeg-static');
    const exec = require('child-process-promise').exec;
    app.get('/categoria/video', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        dir='Dados/videos';
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
    app.get('/categoria/video/:dir', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      cat= req.params.dir;
      dir=config.dir_app+'/Dados/videos/'+cat;
      var files = fs.readdirSync(dir);
      video=[];
      thumb=[];
      for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
        }else{
          vd=name.replace(config.dir_app+'/','');
          ext=vd.substr(-4);
          ext=ext.replace(/\./g,'');
          video.push(vd);
          preview=name.replace(dir,dir+'/thumb');
          preview=preview.replace('.mp4','.jpg');
          preview=preview.replace('.mpg','.jpg');
          preview=preview.replace('.avi','.jpg');
          cmd_preview = ffmpeg.path+' -ss 00:00:02 -i '+name+' -vf scale=400:-1 -vframes 1 '+preview;
          preview=preview.replace(config.dir_app+'/','');
          if (fs.existsSync(preview)) {
          }else{
            exec(cmd_preview)
          }
          thumb.push(preview);
        }
      }
      res.json({
          "status":"successo",
          "video":video,
          "thumb":thumb
      })
    })
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
//Lista as Categorias de Videos
function catVideos(){
  $('#cat_imagens').html();
  dir=dir_app+'/Dados/videos';
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()){
      vl=name;
      option=name.replace(dir+'/','');
      $('#cat_videos').append('<option value="'+vl+'">'+option+'</option>');
      if(i==0){
        lista_video(vl);
      }
    }else{
      //é um arquivo
    }
  }
  $('#current_loading').html('Carregado Vídeos');
}

//Lista Videos
function gera_thumb(video,img,i){
  cmd = ffmpeg.path+' -ss 00:00:02 -i '+video+' -vf scale=400:-1 -vframes 1 '+img;
  exec(cmd).then((result) => {
    setTimeout(() =>{
      action=result.childProcess.spawnargs[2];
      nv_img=action.split('vframes 1 ');
      nv_img=nv_img[1];
      $('#video'+i).attr('src',nv_img);
      console.log(i+' - '+nv_img);
    },1000);
  }).catch(function (err) {
      console.error('ERROR: ', err);
  });
}
function lista_video(dir){
  $('#preview-videos').html('');
  var files = fs.readdirSync(dir);
  for (var i in files){
    orgname=files[i];
    rn=orgname.replace( /\s/g, '' );
    var name = dir + '/' + rn;
    if(orgname!=rn){
      fs.rename(dir + '/'+orgname, name, function (err) {

      });
    }
    try{
      if(fs.lstatSync(name).isDirectory()){
        //É um diretorio
      }else{
        img=name.replace(dir,dir+'/thumb');
        img=img.replace('.mp4','.jpg');
        img=img.replace('.mpg','.jpg');
        img=img.replace('.avi','.jpg');
        video=name;
        ext=name.substr(-4);
        ext=ext.replace(/\./g,'');
        newVideo=video.replace(ext,'mp4');
        list='<li><img id="video'+i+'" src="'+img+'" onclick="viewVideo(\''+btoa(newVideo)+'\')"></li>';
        if (fs.existsSync(img)) {
          //Se o arquivo existir
          $('#preview-videos').append(list);
        }else{
          //Se não existir
          gera_thumb(video,img,i);
          
          if(ext!='mp4'){
            cnv = ffmpeg.path+' -i '+video+' -f mp4 -vcodec libx264 -preset fast -profile:v main -acodec aac '+newVideo+' -hide_banner';
            exec(cnv).then(function(result){
              fs.unlink(video, (err) => {
              });
              $('#preview-videos').append(list);
            }).catch(function (err) {
              console.error('ERROR: ', err);
            });
          }else{
            $('#preview-videos').append(list);
          }
        }
      }
    }catch(e){
    }
  }
  $('#current_loading').html('Carregado Preview de Vídeos');
}