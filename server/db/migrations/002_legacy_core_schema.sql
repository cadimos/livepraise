-- Schema legado (paridade v0.0.8) — idempotente para upgrades e installs frescos.

CREATE TABLE IF NOT EXISTS cat_musicas (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(50),
  nome2 VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS tela (
  id INTEGER PRIMARY KEY,
  tipo VARCHAR(13) DEFAULT 'padrao',
  largura INTEGER DEFAULT 0,
  altura INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS musica (
  id INTEGER PRIMARY KEY,
  cat VARCHAR(11),
  nome VARCHAR(100),
  nome2 VARCHAR(100),
  artista VARCHAR(100),
  compositor VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS musica_versos (
  id INTEGER PRIMARY KEY,
  musica VARCHAR(11),
  verso TEXT
);

CREATE TABLE IF NOT EXISTS biblia_livros (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(100),
  nome2 VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS system (
  id INTEGER PRIMARY KEY,
  os VARCHAR(32) DEFAULT '0',
  hd VARCHAR(32) DEFAULT '0',
  mac VARCHAR(32) DEFAULT '0',
  chave VARCHAR(32) DEFAULT '0',
  serial VARCHAR(32) DEFAULT '0'
);

CREATE TABLE IF NOT EXISTS background_rapido (
  id INTEGER PRIMARY KEY,
  url TEXT,
  diretorio TEXT,
  inicial VARCHAR(1) DEFAULT 'N'
);

CREATE TABLE IF NOT EXISTS cat_biblia (
  id INTEGER PRIMARY KEY,
  nome VARCHAR(50),
  nome2 VARCHAR(50),
  url TEXT
);

INSERT OR IGNORE INTO cat_musicas (id, nome, nome2) VALUES (1, 'Geral', 'geral');
INSERT OR IGNORE INTO tela (id, tipo, largura, altura) VALUES (1, 'padrao', 0, 0);
