#!/usr/bin/env node
/**
 * Smoke CAD-94 residual: A1 (auth mutações música/playlist), A2 (traversal mídia), A7 (displays).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad94-res-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad94-res-pass';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function firstLanIpv4() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

async function login(base, username, password) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  assert(res.ok, `login: ${data.error ?? res.status}`);
  return data.token;
}

function isBlockedStatus(status) {
  return status === 400 || status === 401 || status === 403 || status === 404;
}

try {
  fs.mkdirSync(path.join(testHome, 'imagens', 'testcat'), { recursive: true });
  fs.writeFileSync(
    path.join(testHome, 'imagens', 'testcat', 'photo.jpg'),
    'x',
  );

  const { port } = await startLivepraiseServer(0);
  const loopback = `http://127.0.0.1:${port}`;

  // A2 — traversal bloqueado
  const imgTraversal = await fetch(
    `${loopback}/imagem/categoria/..%2F..%2Fetc%2Fpasswd`,
  );
  assert(isBlockedStatus(imgTraversal.status), `A2 imagem traversal → ${imgTraversal.status}`);

  const vidTraversal = await fetch(`${loopback}/video/categoria/foo%2F..%2Fbar`);
  assert(isBlockedStatus(vidTraversal.status), `A2 video traversal → ${vidTraversal.status}`);

  const imgOk = await fetch(`${loopback}/imagem/categoria/testcat`);
  assert(imgOk.ok, `A2 categoria válida: ${imgOk.status}`);

  // A1 — loopback mutação OK; LAN sem token → 401
  const createLocal = await fetch(`${loopback}/musica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Smoke CAD-94',
      artista: 'Teste',
    }),
  });
  assert(createLocal.ok, `A1 loopback POST /musica: ${createLocal.status}`);

  const resolveLocal = await fetch(`${loopback}/playlist/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songIds: [1] }),
  });
  assert(resolveLocal.ok, `A1 loopback POST /playlist/resolve: ${resolveLocal.status}`);

  const adminToken = await login(loopback, 'admin', 'smoke-cad94-res-pass');
  const lanIp = firstLanIpv4();
  if (lanIp) {
    const lanBase = `http://${lanIp}:${port}`;
    const createLan = await fetch(`${lanBase}/musica`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat: '1',
        nome: 'LAN',
        artista: 'X',
      }),
    });
    assert(createLan.status === 401, `A1 LAN POST /musica sem token → ${createLan.status}`);

    const createAuthed = await fetch(`${lanBase}/musica`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cat: '1',
        nome: 'LAN authed',
        artista: 'X',
      }),
    });
    assert(createAuthed.ok, `A1 LAN POST /musica com token: ${createAuthed.status}`);
  } else {
    console.warn('A1 LAN: sem IPv4 — skip (loopback coberto)');
  }

  // A7 — PUT displays e UPDATE display exigem operador em LAN
  const putDisplaysLocal = await fetch(`${loopback}/displays/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments: [] }),
  });
  assert(putDisplaysLocal.ok, `A7 loopback PUT /displays/config: ${putDisplaysLocal.status}`);

  const updateDisplayLocal = await fetch(`${loopback}/display/led/1920/1080`);
  assert(
    updateDisplayLocal.ok,
    `A7 loopback UPDATE /display: ${updateDisplayLocal.status}`,
  );

  if (lanIp) {
    const lanBase = `http://${lanIp}:${port}`;
    const putLan = await fetch(`${lanBase}/displays/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments: [] }),
    });
    assert(putLan.status === 401, `A7 LAN PUT displays sem token → ${putLan.status}`);

    const displayLan = await fetch(`${lanBase}/display/led/800/600`);
    assert(
      displayLan.status === 401,
      `A7 LAN UPDATE /display sem token → ${displayLan.status}`,
    );
  }

  console.log('Smoke CAD-94 residual OK (A1 + A2 + A7)');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
