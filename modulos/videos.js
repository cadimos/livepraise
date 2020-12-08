module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    const ffmpeg = require('ffmpeg-static');
    const exec = require('child-process-promise').exec;
    /*
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
          cmd_preview = ffmpeg.path+' -ss 00:00:02 -i "'+name+'" -vf scale=400:-1 -vframes 1 "'+preview+'"';
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
    */
}
/*
//converter Video
if(ext!='mp4'){
  cnv = ffmpeg.path+' -i '+video+' -f mp4 -vcodec libx264 -preset fast -profile:v main -acodec aac '+newVideo+' -hide_banner';
  exec(cnv).then(function(result){
    fs.unlink(video, (err) => {
    });
    $('#preview-videos').append(list);
  }).catch(function (err) {
    console.error('ERROR: ', err);
  });
}
*/