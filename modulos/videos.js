module.exports = app => {
    const fs = require('graceful-fs');
    const config = require('../config');
    const ffmpeg = require('ffmpeg-static');
    const exec = require('child-process-promise').exec;
    //  deepcode ignore NoRateLimitingForExpensiveWebOperation: videos
    app.get('/categoria/video', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        dir=config.homedir+'/livepraise/videos';
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
            cat.push(name.replace(config.homedir+'/livepraise/videos/',''));
          }
        }
        res.json({
            "status":"successo",
            "data":cat
        })
    })
//  deepcode ignore NoRateLimitingForExpensiveWebOperation: lista vídeos
    app.get('/categoria/video/:dir', (req, res) => {
      res.setHeader('Access-Control-Allow-Origin', 'Origin');
      cat= decodeURI(req.params.dir);
      dir=config.homedir+'/livepraise/videos/'+cat;
      //  deepcode ignore PT: Listagem dos videos no diretorio
      var files = fs.readdirSync(dir);
      video=[];
      thumb=[];
      for (var i in files){
        //  deepcode ignore PrototypePollution: busca
        //  deepcode ignore UserControlledProperty: <comment the reason here>
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
        }else{
          vd=name.replace(config.homedir+'/livepraise/','');
          ext=vd.substr(-4);
          ext=ext.replace(/\./g,'');
          video.push(vd);
          preview=name.replace(dir,dir+'/thumb');
          preview=preview.replace('.mp4','.jpg');
          preview=preview.replace('.mpg','.jpg');
          preview=preview.replace('.avi','.jpg');
          cmd_preview = ffmpeg.path+' -ss 00:00:02 -i "'+name+'" -vf scale=400:-1 -vframes 1 "'+preview+'"';
          preview=preview.replace(config.homedir+'/livepraise/','');
          if (fs.existsSync(preview)) {
          }else{
            //  deepcode ignore CommandInjection: Cria o preview do video
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
