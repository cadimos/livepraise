#!/usr/bin/env node
/**
 * Smoke CAD-105: editar e excluir músicas — API POST /musica/:id e DELETE /musica/:id.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad105-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad105-pass';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const createRes = await fetch(`${base}/musica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Smoke CAD-105',
      artista: 'Teste',
      compositor: 'CTO',
    }),
  });
  const created = await createRes.json();
  assert(createRes.ok, `POST /musica: ${created.error ?? createRes.status}`);
  assert(created.status === 'successo' && created.id, 'criação devolve id');

  const songId = created.id;

  await fetch(`${base}/musica/verso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ musica: String(songId), verso: 'Verso A' }),
  });

  const updateRes = await fetch(`${base}/musica/${songId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Smoke CAD-105 Editado',
      artista: 'Teste',
      compositor: 'CTO',
    }),
  });
  const updated = await updateRes.json();
  assert(updateRes.ok, `POST /musica/${songId}: ${updated.error ?? updateRes.status}`);
  assert(updated.status === 'successo', 'update status successo');

  await fetch(`${base}/musica/verso`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ musica: String(songId), verso: 'Verso B' }),
  });

  const getRes = await fetch(`${base}/musica/${songId}`);
  const getData = await getRes.json();
  assert(getRes.ok, `GET /musica/${songId}`);
  assert(getData.items?.[0]?.nome === 'Smoke CAD-105 Editado', 'nome actualizado');

  const versesRes = await fetch(`${base}/musica/verso/${songId}`);
  const versesData = await versesRes.json();
  assert(versesRes.ok, `GET /musica/verso/${songId}`);
  assert(versesData.items?.length === 1, 'versos antigos removidos no update');
  assert(versesData.items[0].verso === 'Verso B', 'novo verso persistido');

  const deleteRes = await fetch(`${base}/musica/${songId}`, { method: 'DELETE' });
  const deleted = await deleteRes.json();
  assert(deleteRes.ok, `DELETE /musica/${songId}: ${deleted.error ?? deleteRes.status}`);
  assert(deleted.status === 'successo', 'delete status successo');

  const goneRes = await fetch(`${base}/musica/${songId}`);
  const goneData = await goneRes.json();
  assert(goneRes.ok, `GET após delete`);
  assert(!goneData.items?.length, 'música removida da base');

  const operatorHtml = await fetch(`${base}/operator/`).then((r) => r.text());
  assert(operatorHtml.includes('Operador'), 'operador Vue servido');

  console.log('Smoke CAD-105 OK (editar/excluir música API + operador)');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
