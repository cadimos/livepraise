/**
 * Smoke CAD-99: API nova música + versos (paridade v0.0.8 salvar_musica).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad99-'));
process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function json(port, pathname, init) {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, init);
  const body = await res.json();
  return { res, body };
}

let port;
try {
  ({ port } = await startLivepraiseServer(0));

  const cats = await json(port, '/musica/categoria');
  assert(cats.body.status === 'Sucesso', 'categorias');
  const catId = String(cats.body.items?.[0]?.id ?? 1);

  const created = await json(port, '/musica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: catId,
      nome: 'Smoke CAD-99',
      artista: 'CTO',
      compositor: '',
    }),
  });
  assert(created.body.status === 'successo', 'criar música');
  const songId = created.body.id;
  assert(songId, 'id música');

  for (const verso of ['Verso A', 'Verso B']) {
    const v = await json(port, '/musica/verso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musica: String(songId), verso }),
    });
    assert(v.body.status === 'successo', `verso ${verso}`);
  }

  const verses = await json(port, `/musica/verso/${songId}`);
  assert(verses.body.items?.length === 2, 'dois versos persistidos');

  console.log('smoke-cad99: OK');
} finally {
  await stopLivepraiseServer();
}
