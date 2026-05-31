#!/usr/bin/env node
/**
 * Smoke CAD-102: menu Configurações — API de utilizadores acessível ao operador local.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad102-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad102-pass';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const listLocal = await fetch(`${base}/api/users`);
  const listData = await listLocal.json();
  assert(listLocal.ok, `GET /api/users local: ${listData.error ?? listLocal.status}`);
  assert(
    listData.users.some((u) => u.username === 'admin'),
    'lista inclui admin bootstrap',
  );

  const createLocal = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'remoto_cad102',
      password: 'cad102-pass',
      role: 'remote',
    }),
  });
  const created = await createLocal.json();
  assert(createLocal.ok, `POST /api/users local: ${created.error ?? createLocal.status}`);

  const patchLocal = await fetch(`${base}/api/users/${created.user.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: false }),
  });
  const patched = await patchLocal.json();
  assert(patchLocal.ok, `PATCH /api/users local: ${patched.error ?? patchLocal.status}`);
  assert(patched.user.active === false, 'PATCH desactiva utilizador');

  const operatorHtml = await fetch(`${base}/operator/`).then((r) => r.text());
  assert(operatorHtml.includes('Operador'), 'operador Vue servido');

  console.log('Smoke CAD-102 OK (utilizadores local + operador)');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
