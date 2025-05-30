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
        dir=homedir+'/livepraise/imagens';
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
          var name = dir + '/' + files[i];
          if (fs.statSync(name).isDirectory()){
            cat.push(name.replace(homedir+'/livepraise/imagens/',''));
          }
        }
        cat.sort();
        res.json({
            "status":"successo",
            "imagens":cat
        })
    })
    api.get('/categoria/:codigo',async (req,res)=>{
        let codigo = req.params.codigo;
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        cat= decodeURI(codigo);
        let dir=homedir+'/livepraise/imagens/'+cat;
        var files = fs.readdirSync(dir);
        cat=[];
        for (var i in files){
        var name = dir + '/' + files[i];
        if (fs.statSync(name).isDirectory()){
        }else{
            cat.push(name.replace(homedir+'/livepraise/',''));
        }
        }
        res.json({
            "status":"successo",
            "imagens":cat
        })
    })
    app.use('/imagem',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}