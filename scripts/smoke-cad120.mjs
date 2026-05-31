#!/usr/bin/env node
/**
 * Smoke CAD-120: log de erros — append, listagem, sanitização e limpeza.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad120-'));
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

  const empty = await json(port, '/api/system/error-log');
  assert(empty.res.ok, 'GET inicial');
  assert(empty.body.status === 'Sucesso', 'status GET');
  assert(Array.isArray(empty.body.items) && empty.body.items.length === 0, 'lista vazia');

  const secretToken = 'Bearer super-secret-token-abc123';
  const created = await json(port, '/api/system/error-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      level: 'error',
      source: 'smoke',
      message: `Falha autenticada ${secretToken}`,
      detail: JSON.stringify({ password: 'changeme', token: 'abc' }),
    }),
  });
  assert(created.res.status === 201, 'POST erro controlado');
  assert(created.body.entry?.message.includes('[REDACTED]'), 'sanitização Bearer');
  assert(!created.body.entry?.detail?.includes('changeme'), 'sanitização password');

  const listed = await json(port, '/api/system/error-log');
  assert(listed.body.items.length === 1, '1 entrada após append');
  assert(listed.body.items[0].message.includes('[REDACTED]'), 'lista sanitizada');

  const cleared = await json(port, '/api/system/error-log', { method: 'DELETE' });
  assert(cleared.res.ok, 'DELETE limpar');
  assert(cleared.body.status === 'Sucesso', 'status limpar');

  const afterClear = await json(port, '/api/system/error-log');
  assert(afterClear.body.items.length === 0, 'lista vazia após limpar');

  for (const source of ['ui', 'vue', 'fetch']) {
    const client = await json(port, '/api/system/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        source,
        message: `Smoke erro ${source}`,
      }),
    });
    assert(client.res.status === 201, `POST source=${source}`);
    assert(client.body.entry?.source === source, `source persistido ${source}`);
  }

  console.log('smoke-cad120: OK');
} finally {
  await stopLivepraiseServer();
}
