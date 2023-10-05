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
    app.use('/musica',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}