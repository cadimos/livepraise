require('dotenv').config() //Carrega as Variaveis de ambiente
const sql = require('sqlite3').verbose();
const path = require('path');

module.exports = class Database {
    constructor() {
        this.status = 0;
        this.connect();
    }

    /**
     * Conecta ao banco de dados
     * @param {string} arquivo - Caminho opcional para o arquivo do banco de dados
     */
    async connect(arquivo = '') {
        const homedir = require('os').homedir();
        if (arquivo === '') {
            arquivo = path.join(homedir, 'livepraise', 'dsw.bd');
        }
        this.arquivo = arquivo;
        this.conn = new sql.Database(arquivo);
        this.status = 1;
    }

    /**
     * Retorna o caminho atual do banco de dados
     */
    getAtual() {
        return this.arquivo;
    }

    /**
     * Valida a conexão com o banco de dados
     */
    async validaConexao() {
        return await new Promise(resolve => {
            const id = setInterval(() => {
                if (this.status === 1) {
                    clearInterval(id);
                    resolve(true);
                }
            }, 500);
        });
    }

    /**
     * Executa uma consulta SELECT
     * @param {string} query - Query SQL
     */
    async all(query) {
        return new Promise((resolve) => {
            this.conn.all(query, [], (err, row) => {
                if (err) {
                    resolve({
                        status: "Error",
                        mensagem: err
                    });
                    return;
                }
                resolve(row);
            });
        });
    }

    /**
     * Executa uma query de modificação (INSERT, UPDATE, DELETE)
     * @param {string} query - Query SQL
     * @param {Array} data - Dados para a query
     */
    async run(query, data = []) {
        return new Promise((resolve) => {
            if (query.includes('INSERT')) {
                this.conn.run(query, data, function (err) {
                    if (err) {
                        resolve({
                            status: "Error",
                            mensagem: err
                        });
                        return;
                    }
                    resolve(this.lastID);
                });
            } else {
                this.conn.run(query, data, (err, rows) => {
                    if (err) {
                        resolve({
                            status: "Error",
                            mensagem: err
                        });
                        return;
                    }
                    resolve(rows);
                });
            }
        });
    }
};