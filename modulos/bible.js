const express = require('express') //Modulo do servidor
const BD = require('../middlewares/bd');
const fs = require('graceful-fs');
const db = new BD();
const homedir = require('os').homedir();
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    const api = express.Router(); //Defino em qual variavel vai ficar armazenado as rotas do grupo
    //Listo as Biblias
    api.get('/', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        let dir = homedir + '/livepraise/biblias';
        let files = fs.readdirSync(dir);
        let items = [];
        for (let i in files) {
            let name = dir + '/' + files[i];
            if (fs.statSync(name).isDirectory()) {
            } else {
                if (name.indexOf("sqlite") != -1) {
                    let conn = db.connect(name);
                    let rows = await db.all("SELECT value FROM metadata WHERE `key` LIKE 'copyright'");
                    if (rows.status == 'Error') {
                        res.json(items);
                        return;
                    }
                    let item = {
                        'nome': rows[0].value,
                        'arquivo': name.replace(dir + '/', '')
                    }
                    items.push(item);
                }
            }
        }
        res.json({
            "status": "successo",
            "biblias": items
        })
    })
    //Listo os livros da Biblia
    api.get('/livros/:biblia', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        let biblia = req.params.biblia;
        let dir = homedir + '/livepraise/biblias';
        let name = dir + '/' + biblia;
        let conn = db.connect(name);
        items=await db.all("SELECT id,name as nome FROM book");
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
    
    //Listo os capitulos do Livro
    api.get('/capitulo/:biblia/:livro', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        livro = req.params.livro;
        let dir = homedir + '/livepraise/biblias';
        let name = dir + '/' + biblia;
        let conn = db.connect(name);
        items=await db.all(`SELECT COUNT(DISTINCT(chapter)) as capitulos FROM verse WHERE book_id = ${livro}`);
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            items
        })
    })
    //Listo os versiculos
    api.get('/versiculo/:biblia/:livro/:capitulo', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        livro = req.params.livro;
        capitulo = req.params.capitulo;
        let dir = homedir + '/livepraise/biblias';
        let name = dir + '/' + biblia;
        let conn = db.connect(name);
        let nomeLivro=await db.all(`SELECT name FROM book WHERE  book_reference_id =  ${livro}`);
        let items=await db.all(`SELECT id,text as texto,verse as versiculo FROM verse WHERE  book_id = ${livro} AND chapter= ${capitulo}`);
        if(items.status=='Error'){
            res.json(items);
            return;
        }
        res.json({
            status:"Sucesso",
            livro: nomeLivro[0].name,
            items
        })
    })
    /*
    //faco a busca do livro
    app.get('/busca/biblia/:biblia/:busca', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        busca = req.params.busca;
        var db = new sqlite3(homedir + '/livepraise/biblias/' + biblia);
        //  deepcode ignore HTTPSourceWithUncheckedType: busca
        let livro = busca.match(/^([0-3]|[a-z]) *([a-z])* /ig);
        //  deepcode ignore HTTPSourceWithUncheckedType: busca
        texto = busca.replace(livro, '');
        //  deepcode ignore GlobalReplacementRegex: busca
        texto = texto.replace(' ', '');
        if (texto.indexOf(":") > 0) {
            i = texto.split(':');
            capitulo = i[0];
            if (i.length > 1) {
                versiculo = i[1];
            } else {
                versiculo = '';
            }
        } else {
            capitulo = texto;
            versiculo = '';
        }
        if (livro == 'jo') {
            rows = db.prepare("SELECT id FROM book WHERE `name` LIKE ?").all(livro);
        } else {
            livro = livro + '%';
            rows = db.prepare("SELECT id FROM book WHERE `name` LIKE ?").all(livro);
        }
        res.json({
            "status": "successo",
            "busca": busca,
            'livro': rows,
            "capitulo": capitulo,
            "versiculo": versiculo,
        })
    })
    */
    app.use('/biblias',api); //defino o URL do Grupo e exporto ele, com todas as rotas
}