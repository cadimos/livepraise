require('dotenv').config() //Carrega as Variaveis de ambiente
const sql = require('sqlite3').verbose();

module.exports = class bd {
    constructor() {
        this.status = 0;
        this.connect();
    }
    async connect(arquivo='') {
        let homedir = require('os').homedir();
        if(arquivo==''){
            arquivo=`${homedir}/livepraise/dsw.bd`
        }
        this.conn = new sql.Database(arquivo);
        this.status = 1;
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
    /*
    async findAll(tabela,option={}){
        await this.validaConexao();
        let limit='';
        if(option.limit){
            limit=`TOP ${option.limit}`
        }
        let query=`select ${limit} * from ${tabela}`;
        let result= await this.conn.request().query(query);
        if(result.recordset){
            result=JSON.stringify(result.recordset);
        }
        return result;
    }
    async find(tabela,where,option={}){
        await this.validaConexao();
        let limit='';
        let search='';
        if(where.length>0){
            for(let s=0;s<where.length;s++){
                let i= where[s];
                if(search==''){
                    search=`where ${i[0]} ${i[1]} ${i[2]}`
                }else{
                    search+=` and ${i[0]} ${i[1]} ${i[2]}`
                }
            }
        }
        if(option.limit){
            limit=`TOP ${option.limit}`
        }
        let query=`select ${limit} * from ${tabela} ${search}`;
        console.log(query);
        let result= await this.conn.request().query(query);
        if(result.recordset){
            result=JSON.stringify(result.recordset);
        }
        return result;
    }
    
    async query(query){
        let result=await this.conn.request().query(query).then((result)=>{
            if(result.recordset){
                result=JSON.stringify(result.recordset);
            }
            return result;
        }).catch((err)=>{
            return {
                status:"Error",
                mensagem: err.message
            };
        });
        return result;
    }
    */
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
};