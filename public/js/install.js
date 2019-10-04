/* Instalação Inicial */
var db = new sqlite3.Database(__dirname+'/../dsw.db');
function install_bd_base(){
    db.serialize(function() {
        db.run("PRAGMA foreign_keys = off;");
        BEGIN TRANSACTION;
        //Crio os Livros da Biblia
        CREATE TABLE biblia_livros (id INTEGER PRIMARY KEY AUTOINCREMENT, nome VARCHAR (100), nome2 VARCHAR (100));
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (1, 'Gênesis', 'Genesis');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (2, 'Êxodo', 'Exodo');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (3, 'Levítico', 'Levitico');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (4, 'Números', 'Numeros');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (5, 'Deuteronômio', 'Deuteronomio');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (6, 'Josué', 'Josue');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (7, 'Juízes', 'Juizes');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (8, 'Rute', 'Rute');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (9, '1 Samuel', '1 Samuel');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (10, '2 Samuel', '2 Samuel');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (11, '1 Reis', '1 Reis');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (12, '2 Reis', '2 Reis');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (13, '1 Crônicas', '1 Cronicas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (14, '2 Crônicas', '2 Cronicas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (15, 'Esdras', 'Esdras');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (16, 'Neemias', 'Neemias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (17, 'Ester', 'Ester');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (18, 'Jó', 'Jo');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (19, 'Salmos', 'Salmos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (20, 'Provérbios', 'Proverbios');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (21, 'Eclesiastes', 'Eclesiastes');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (22, 'Cânticos', 'Canticos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (23, 'Isaías', 'Isaias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (24, 'Jeremias', 'Jeremias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (25, 'Lamentações', 'Lamentacoes');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (26, 'Ezequiel', 'Ezequiel');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (27, 'Daniel', 'Daniel');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (28, 'Oseias', 'Oseias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (29, 'Joel', 'Joel');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (30, 'Amós', 'Amos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (31, 'Obadias', 'Obadias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (32, 'Jonas', 'Jonas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (33, 'Miqueias', 'Miqueias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (34, 'Naum', 'Naum');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (35, 'Habacuque', 'Habacuque');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (36, 'Sofonias', 'Sofonias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (37, 'Ageu', 'Ageu');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (38, 'Zacarias', 'Zacarias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (39, 'Malaquias', 'Malaquias');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (40, 'Mateus', 'Mateus');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (41, 'Marcos', 'Marcos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (42, 'Lucas', 'Lucas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (43, 'João', 'Joao');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (44, 'Atos', 'Atos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (45, 'Romanos', 'Romanos');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (46, '1 Coríntios', '1 Corintios');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (47, '2 Coríntios', '2 Coríintios');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (48, 'Gálatas', 'Galatas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (49, 'Efésios', 'Efesios');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (50, 'Filipenses', 'Filipenses');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (51, 'Colossenses', 'Colossenses');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (52, '1 Tessalonicenses', '1 Tessalonicenses');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (53, '2 Tessalonicenses', '2 Tessalonicenses');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (54, '1 Timóteo', '1 Timoteo');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (55, '2 Timóteo', '2 Timoteo');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (56, 'Tito', 'Tito');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (57, 'Filémon', 'Filemon');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (58, 'Hebreus', 'Hebreus');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (59, 'Tiago', 'Tiago');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (60, '1 Pedro', '1 Pedro');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (61, '2 Pedro', '2 Pedro');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (62, '1 João', '1 Joao');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (63, '2 João', '2 Joao');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (64, '3 João', '3 Joao');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (65, 'Judas', 'Judas');
        INSERT INTO biblia_livros (id, nome, nome2) VALUES (66, 'Apocalipse', 'Apocalipse');

        //Crio a Tabela das Biblias
        CREATE TABLE cat_biblia (id INTEGER PRIMARY KEY AUTOINCREMENT, nome VARCHAR (50), nome2 VARCHAR (50));

        //Crio a Tabela de Músicas
        CREATE TABLE cat_musicas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome VARCHAR (50), nome2 VARCHAR (50));
        INSERT INTO cat_musicas (id, nome, nome2) VALUES (1, 'Louvor', 'Louvor');

        COMMIT TRANSACTION;
        PRAGMA foreign_keys = on;
    });
}
