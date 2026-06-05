#!/usr/bin/env node
/**
 * Smoke: upgrade de base legada v0.0.8 (sem schema_migrations) → migrations 1.x.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const distServer = path.join(root, 'dist', 'server', 'index.js');

if (!fs.existsSync(distServer)) {
  console.log('smoke-legacy-upgrade: execute npm run build:server primeiro');
  process.exit(0);
}

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-legacy-'));
const livepraiseHome = path.join(testHome, 'livepraise');
const dbPath = path.join(livepraiseHome, 'dsw.bd');
fs.mkdirSync(livepraiseHome, { recursive: true });

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = root;

const legacyDb = new DatabaseSync(dbPath);
legacyDb.exec(`
  CREATE TABLE cat_musicas (id INTEGER PRIMARY KEY, nome VARCHAR(50), nome2 VARCHAR(50));
  CREATE TABLE musica (id INTEGER PRIMARY KEY, cat VARCHAR(11), nome VARCHAR(100));
  CREATE TABLE musica_versos (id INTEGER PRIMARY KEY, musica VARCHAR(11), verso TEXT);
  INSERT INTO cat_musicas (id, nome, nome2) VALUES (1, 'Geral', 'geral');
  INSERT INTO musica (id, cat, nome) VALUES (42, '1', 'Louvor Teste');
  INSERT INTO musica_versos (id, musica, verso) VALUES (1, '42', 'Linha A');
`);
legacyDb.close();

const { isLegacyV008Database } = await import(
  pathToFileURL(path.join(root, 'dist', 'server', 'db', 'legacy-upgrade.js')).href
);
assert.equal(isLegacyV008Database(dbPath), true, 'detecta legado v0.0.8');

const { prepareDatabase, closeLivepraiseServer } = await import(
  pathToFileURL(distServer).href
);
const applied = await prepareDatabase();
assert(applied >= 7, `migrations aplicadas: ${applied}`);

const db = new DatabaseSync(dbPath);
const maxMigration = db
  .prepare('SELECT MAX(version) AS v FROM schema_migrations')
  .get();
assert((maxMigration?.v ?? 0) >= 7, 'schema_migrations até v7');

const musica = db.prepare('SELECT nome FROM musica WHERE id = 42').get();
assert.equal(musica?.nome, 'Louvor Teste', 'dados legados preservados');

const users = db
  .prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='users'",
  )
  .get();
assert(String(users?.sql ?? '').includes("'admin'"), 'users aceita admin');
db.close();

await closeLivepraiseServer?.().catch(() => {});
fs.rmSync(testHome, { recursive: true, force: true });
console.log('smoke-legacy-upgrade: concluído.');
