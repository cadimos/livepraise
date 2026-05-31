#!/usr/bin/env node
/**
 * Smoke CAD-149: menu de contexto em mídia — propriedades, mover categoria, PATCH fundo rápido.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad149-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const imgDir = path.join(testHome, 'livepraise', 'imagens', 'Smoke');
  fs.mkdirSync(imgDir, { recursive: true });
  const imgPath = path.join(imgDir, 'tile.jpg');
  fs.writeFileSync(imgPath, Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;
  const rel = 'imagens/Smoke/tile.jpg';

  const propsRes = await fetch(
    `${base}/imagem/propriedades?path=${encodeURIComponent(rel)}`,
  ).then((r) => r.json());
  assert(propsRes.status === 'successo', 'GET propriedades');
  assert(propsRes.name === 'tile.jpg', 'nome do ficheiro');
  assert(propsRes.category === 'Smoke', 'categoria');

  const catDir = path.join(testHome, 'livepraise', 'imagens', 'Outra');
  fs.mkdirSync(catDir, { recursive: true });

  const moveRes = await fetch(`${base}/imagem/categoria`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: rel, toCategory: 'Outra' }),
  }).then((r) => r.json());
  assert(moveRes.status === 'successo', 'PATCH mover categoria');
  assert(moveRes.path === 'imagens/Outra/tile.jpg', 'novo path');
  assert(fs.existsSync(path.join(catDir, 'tile.jpg')), 'ficheiro movido no disco');

  const dbPath = path.join(testHome, 'livepraise', 'dsw.bd');
  const { spawnSync } = await import('node:child_process');
  const seed = spawnSync(
    'sqlite3',
    [
      dbPath,
      `INSERT INTO background_rapido (id, url, diretorio, inicial) VALUES (7, 'imagens/legacy/old.jpg', 'imagens', 'N');`,
    ],
    { encoding: 'utf8' },
  );
  assert(seed.status === 0, `seed: ${seed.stderr || seed.stdout}`);

  const patchRes = await fetch(`${base}/background-rapido/7`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'imagens/Outra/tile.jpg', diretorio: 'imagens' }),
  }).then((r) => r.json());
  assert(patchRes.status === 'Sucesso', 'PATCH fundo rápido');

  const list = await fetch(`${base}/background-rapido`).then((r) => r.json());
  const slot = list.items?.find((i) => i.id === 7);
  assert(slot?.url === 'imagens/Outra/tile.jpg', 'slot actualizado na BD');

  console.log('smoke-cad149: OK');
} finally {
  await stopLivepraiseServer?.();
  fs.rmSync(testHome, { recursive: true, force: true });
}
