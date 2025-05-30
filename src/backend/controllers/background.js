const BD = require('../middlewares/bd');
const db=new BD();
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    //Grupo de Rotas
    app.get('/background-rapido',async (req,res)=>{
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items=await db.all("SELECT url,diretorio,inicial FROM background_rapido ORDER BY id ASC");
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
}