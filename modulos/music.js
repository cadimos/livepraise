const express = require('express') //Modulo do servidor
const BD = require('../middlewares/bd');
const db=new BD();
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    const api = express.Router(); //Defino em qual variavel vai ficar armazenado as rotas do grupo
    //Grupo de Rotas
    api.get('/categoria',async (req,res)=>{
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items=await db.all("SELECT * FROM cat_musicas");
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
    api.get('/categoria/:codigo',async (req,res)=>{
        let codigo = req.params.codigo;
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items=await db.all(`SELECT * FROM musica WHERE cat = ${codigo} ORDER BY nome2 ASC`);
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
    api.get('/verso/:codigo',async (req,res)=>{
        let codigo = req.params.codigo;
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items=await db.all(`SELECT * FROM musica_versos WHERE musica = ${codigo}`);
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
    api.post("/", async (req, res, next) => {
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
        info=await db.run("INSERT INTO musica (cat, nome, nome2, artista,compositor) VALUES (?,?,?,?,?)",[data.cat, data.nome,data.nome, data.artista,data.compositor]);
        res.json({
              "status":"successo",
              "data": data,
              "id" : info
          });
    })
    api.post("/verso", async (req, res, next) => {
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
        info=await db.run("INSERT INTO musica_versos (musica, verso) VALUES (?,?)",[data.musica, data.verso])
        res.json({
              "status":"successo",
              "data": data,
              "id" : info
          })
      })
    app.use('/musica',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}