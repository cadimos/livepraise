const express = require('express') //Modulo do servidor
const BD = require('../middlewares/bd');
const db=new BD();
const homedir = require('os').homedir();
const fs = require('graceful-fs');
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    const api = express.Router(); //Defino em qual variavel vai ficar armazenado as rotas do grupo
    //Grupo de Rotas
    api.get('/',async (req,res)=>{
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items=await db.all("SELECT * FROM tela");
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"successo",
            data: items
        })
    })
    app.use('/display',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}