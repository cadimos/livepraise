const express = require('express') //Modulo do servidor
const BD = require('../middlewares/bd');
const db=new BD();
const homedir = require('os').homedir();
const fs = require('graceful-fs');
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    const api = express.Router(); //Defino em qual variavel vai ficar armazenado as rotas do grupo
    //Grupo de Rotas
    api.get('/categoria',async (req,res)=>{
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        let dir=homedir+'/livepraise/videos';
        var files = fs.readdirSync(dir);
        let cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
              cat.push(name.replace(homedir+'/livepraise/videos/',''));
            }
        }
        cat.sort();
        res.json({
            "status":"successo",
            "videos":cat
        })
    })
    api.get('/categoria/:codigo',async (req,res)=>{
        let codigo = req.params.codigo;
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        let cat= decodeURI(codigo);
        let dir=homedir+'/livepraise/videos/'+cat;
        let videos=[];
        var files = fs.readdirSync(dir);
        let preview='';
        let ext='';
        for (var i in files){
            var name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()){
            }else{
                preview=files[i];
                ext=preview.substring(preview.length-5).split('.')[1];
                preview=`videos/${cat}/thumb/${preview.replace('.'+ext,'')}.jpg`;
                videos.push({
                    video: name.replace(homedir+'/livepraise/',''),
                    thumb: fs.existsSync(homedir+'/livepraise/'+preview) ? preview : ''
                });
            }
        }
        res.json({
            "status":"successo",
            "videos":videos
        })
    })
    app.use('/video',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}