const BD = require('../middlewares/bd');
const fs = require('graceful-fs');
const db = new BD();
const homedir = require('os').homedir();
//Indico a exportação, para ser usado nas rotas
module.exports = app => {
    //Listo as Biblias
    app.get('/lista/biblias', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        dir = homedir + '/livepraise/biblias';
        var files = fs.readdirSync(dir);
        items = [];
        for (var i in files) {
            var name = dir + '/' + files[i];
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
    app.get('/livros/biblia/:biblia', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        var db = new sqlite3(homedir + '/livepraise/biblias/' + biblia);
        rows = db.prepare("SELECT id,name as nome FROM book").all();
        res.json({
            "status": "successo",
            "data": rows
        })
    })
    //Listo os capitulos do Livro
    app.get('/capitulo/biblia/:biblia/:livro', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        livro = req.params.livro;
        var db = new sqlite3(homedir + '/livepraise/biblias/' + biblia);
        rows = db.prepare("SELECT COUNT(DISTINCT(chapter)) as capitulos FROM verse WHERE book_id = ?").all(livro);
        res.json({
            "status": "successo",
            "data": rows
        })
    })
    //Listo os versiculos
    app.get('/versiculo/biblia/:biblia/:livro/:capitulo', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        livro = req.params.livro;
        capitulo = req.params.capitulo;
        var db = new sqlite3(homedir + '/livepraise/biblias/' + biblia);
        nomeLivro = db.prepare("SELECT name FROM book WHERE  book_reference_id = ?").get(livro);
        rows = db.prepare("SELECT id,text as texto,verse as versiculo FROM verse WHERE  book_id = ? AND chapter= ?").all(livro, capitulo);
        res.json({
            "status": "successo",
            "livro": nomeLivro,
            "data": rows
        })
    })
    //faco a busca do livro
    app.get('/busca/biblia/:biblia/:busca', (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        biblia = req.params.biblia;
        busca = req.params.busca;
        var db = new sqlite3(homedir + '/livepraise/biblias/' + biblia);
        //  deepcode ignore HTTPSourceWithUncheckedType: busca
        let livro = busca.match(/^([0-3]|[a-z]) *([a-z])*/ig);
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
    /*
    app.get('/background-rapido', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', 'Origin');
        items = await db.all("SELECT url,diretorio,inicial FROM background_rapido ORDER BY a ASC");
        if (items.status == 'Error') {
            res.json(items);
            return;
        }
        res.json({
            status: "Sucesso",
            items
        })
    })
    */
}