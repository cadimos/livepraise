const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
console.log('CONFIG:', config);

/**
 * Verifica e cria a estrutura de diretórios e arquivos necessários
 * @returns {Promise<void>}
 */
async function verificarEstrutura() {
    try {
        // Obtém o diretório base do usuário
        const userDir = path.dirname(config.database.path);
        // Corrigindo o caminho do diretório de instalação
        const installDir = path.join(__dirname, '../../../install/livepraise');
        console.log('Diretório:', __dirname);
        console.log('Diretório de instalação:', installDir);
        console.log('Diretório do usuário:', userDir);

        // Verifica se o diretório de instalação existe
        const installExists = await fs.pathExists(installDir);
        console.log(`Diretório de instalação existe: ${installExists}`);
        if (!installExists) {
            throw new Error(`Diretório de instalação não encontrado: ${installDir}`);
        }

        // Lista de diretórios necessários
        const diretorios = [
            { src: 'imagens', dest: config.media.images.path },
            { src: 'videos', dest: config.media.videos.path },
            { src: 'backup', dest: config.database.backupPath },
            { src: 'logs', dest: config.logging.file },
            { src: 'biblias', dest: config.biblias.path }
        ];
        const diretoriosValidos = diretorios.filter(dir => dir.dest);

        // Primeiro, cria todos os diretórios necessários
        console.log('Criando diretórios necessários...');
        if (!(await fs.pathExists(userDir))) {
            console.log('Diretório não existe, criando...');
            await fs.ensureDir(userDir);
        }
        
        for (const dir of diretoriosValidos) {
            const destPath = dir.dest;
            if (!(await fs.pathExists(destPath))) {
                console.log(`Criando diretório: ${destPath}`);
                await fs.ensureDir(destPath);
            }
        }

        // Depois, copia o banco de dados se necessário
        const dbSrcPath = path.join(installDir, 'dsw.bd');
        const dbDestPath = config.database.path;

        if (await fs.pathExists(dbSrcPath)) {
            const destExists = await fs.pathExists(dbDestPath);
            const shouldCopyDb = !destExists || (await fs.stat(dbDestPath)).size === 0;

            if (shouldCopyDb) {
                console.log('Copiando banco de dados...');
                const fileContent = await fs.readFile(dbSrcPath);
                await fs.writeFile(dbDestPath, fileContent);
                console.log('Banco de dados copiado com sucesso');
            } else {
                console.log('Banco de dados já existe e não está vazio, mantendo o arquivo atual');
            }
        }

        // Por fim, copia os diretórios com seus conteúdos
        for (const dir of diretoriosValidos) {
            const srcPath = path.join(installDir, dir.src);
            const destPath = dir.dest;

            if (await fs.pathExists(srcPath)) {
                console.log(`Verificando diretório: ${dir.src}`);
                const destExists = await fs.pathExists(destPath);
                const destEmpty = destExists ? (await fs.readdir(destPath)).length === 0 : true;

                if (!destExists || destEmpty) {
                    console.log(`Copiando conteúdo do diretório: ${dir.src}`);
                    await fs.copy(srcPath, destPath);
                    console.log(`Diretório ${dir.src} copiado com sucesso`);
                } else {
                    console.log(`Diretório ${dir.src} já existe e não está vazio, mantendo o conteúdo atual`);
                }
            }
        }

        console.log('Estrutura de arquivos verificada e atualizada com sucesso');
    } catch (error) {
        console.error('Erro ao verificar estrutura de arquivos:', error);
        throw error;
    }
}

module.exports = {
    verificarEstrutura
}; 