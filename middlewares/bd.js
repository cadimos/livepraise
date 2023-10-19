require('dotenv').config() //Carrega as Variaveis de ambiente
const sql = require('sqlite3').verbose();

module.exports = class bd {
    constructor() {
        this.status = 0;
        this.connect();
    }
    async connect(arquivo = '') {
        let homedir = require('os').homedir();
        if (arquivo == '') {
            arquivo = `${homedir}/livepraise/dsw.bd`
        }
        this.arquivo = arquivo;
        this.conn = new sql.Database(arquivo);
        this.status = 1;
    }
    getAtual() {
        return this.arquivo;
    }
    async validaConexao() {
        let status = this.status;
        return await new Promise(resolve => {
            let id = setInterval(() => {
                if (this.status == 1) {
                    clearInterval(id);
                    resolve(true);
                }
            }, 500);
        });
    }
    async all(query) {
        return new Promise((resolve, reject) => {
            this.conn.all(query, [], (err, row) => {
                if (err) {
                    let ret = {
                        status: "Error",
                        mensagem: err
                    };
                    resolve(ret);
                }
                resolve(row);
            });
        });
    }
    async run(query, data = []) {
        return new Promise((resolve, reject) => {
            if (query.includes('INSERT')) {
                this.conn.run(query, data, function (err) {
                    if (err) {
                        let ret = {
                            status: "Error",
                            mensagem: err
                        };
                        resolve(ret);
                    }
                    resolve(this.lastID);
                });
            } else {
                this.conn.run(query, data, (err, rows) => {
                    if (err) {
                        let ret = {
                            status: "Error",
                            mensagem: err
                        };
                        resolve(ret);
                    }
                    resolve(rows);
                });
            }

        });
    }
};