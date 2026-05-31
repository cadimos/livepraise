/**
 * Smoke CAD-104: ordem dos versos ao salvar música (3+ estrofes, GET ORDER BY id ASC).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad104-'));
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

/** Insere versos em sequência (paridade NewSongModal — await por verso). */
async function insertVersesSequential(port, songId, verses) {
  for (const verso of verses) {
    const v = await json(port, '/musica/verso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musica: String(songId), verso }),
    });
    assert(v.body.status === 'successo', `inserir verso: ${verso}`);
  }
}

const EXPECTED = ['Estrofe Alpha', 'Estrofe Beta', 'Estrofe Gamma', 'Estrofe Delta'];

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
      nome: 'Smoke CAD-104',
      artista: 'CTO',
      compositor: '',
    }),
  });
  assert(created.body.status === 'successo', 'criar música');
  const songId = created.body.id;
  assert(songId, 'id música');

  await insertVersesSequential(port, songId, EXPECTED);

  const verses = await json(port, `/musica/verso/${songId}`);
  assert(verses.body.status === 'Sucesso', 'GET versos');
  const items = verses.body.items ?? [];
  assert(items.length === EXPECTED.length, `${EXPECTED.length} versos persistidos`);

  for (let i = 0; i < EXPECTED.length; i++) {
    assert(items[i].verso === EXPECTED[i], `ordem verso ${i}: esperado "${EXPECTED[i]}", obtido "${items[i]?.verso}"`);
  }

  const ids = items.map((row) => row.id);
  for (let i = 1; i < ids.length; i++) {
    assert(ids[i] > ids[i - 1], `ids monotônicos (ordem de inserção): ${ids.join(',')}`);
  }

  console.log('smoke-cad104: OK');
} finally {
  await stopLivepraiseServer();
}
