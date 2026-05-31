#!/usr/bin/env node
/**
 * Smoke CAD-119: papel admin com todas as visualizações de monitor; operador restrito.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad119-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad119-pass';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(base, username, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  assert(res.ok, `login ${username}: ${JSON.stringify(data)}`);
  return data;
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const admin = await login(base, 'admin', 'smoke-cad119-pass');
  assert(admin.user.role === 'admin', `bootstrap admin role: ${admin.user.role}`);
  assert(
    admin.displayRoles.includes('projection'),
    `admin displayRoles: ${admin.displayRoles.join(',')}`,
  );

  const operador = await createOperator(base);
  assert(
    operador.displayRoles.length === 2 &&
      operador.displayRoles.includes('operator') &&
      !operador.displayRoles.includes('projection'),
    `operador displayRoles: ${operador.displayRoles.join(',')}`,
  );

  const configBody = {
    assignments: [
      {
        displayId: 1,
        label: 'Monitor 1',
        role: 'operator',
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        primary: true,
      },
      {
        displayId: 2,
        label: 'Monitor 2',
        role: 'projection',
        bounds: { x: 800, y: 0, width: 800, height: 600 },
        primary: false,
      },
    ],
    updatedAt: new Date().toISOString(),
  };

  const adminSave = await fetch(`${base}/displays/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admin.token}`,
    },
    body: JSON.stringify(configBody),
  });
  assert(adminSave.ok, `admin PUT displays: ${adminSave.status}`);

  const operadorBlock = await fetch(`${base}/displays/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${operador.token}`,
    },
    body: JSON.stringify(configBody),
  });
  assert(operadorBlock.status === 403, `operador PUT projection deve 403: ${operadorBlock.status}`);

  const me = await fetch(`${base}/api/auth/me`, {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const meData = await me.json();
  assert(meData.user.role === 'admin', '/api/auth/me role');

  console.log('Smoke CAD-119 OK');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}

async function createOperator(base) {
  const create = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'op119',
      password: 'op119-pass',
      role: 'operator',
    }),
  });
  assert(create.ok, `criar operador: ${create.status}`);
  return login(base, 'op119', 'op119-pass');
}
