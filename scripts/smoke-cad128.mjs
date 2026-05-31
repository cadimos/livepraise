#!/usr/bin/env node
/**
 * Smoke CAD-128 (M13): /api/users — bypass loopback documentado; LAN exige token operator.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad128-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad128-pass';

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
  assert(res.ok, `login ${username}: ${data.error ?? res.status}`);
  return data.token;
}

try {
  const { port } = await startLivepraiseServer(0);
  const loopback = `http://127.0.0.1:${port}`;

  const listLocal = await fetch(`${loopback}/api/users`);
  assert(listLocal.ok, `M13 loopback GET /api/users: ${listLocal.status}`);

  const createLocal = await fetch(`${loopback}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'cad128_local',
      password: 'cad128-local-pass',
      role: 'remote',
    }),
  });
  assert(createLocal.ok, `M13 loopback POST /api/users: ${createLocal.status}`);

  const adminToken = await login(loopback, 'admin', 'smoke-cad128-pass');

  const lanIp = firstLanIpv4();
  if (lanIp) {
    const lanBase = `http://${lanIp}:${port}`;
    const remoteList = await fetch(`${lanBase}/api/users`);
    assert(
      remoteList.status === 401,
      `M13 LAN GET /api/users sem token deve 401 (got ${remoteList.status})`,
    );

    const remoteAuthed = await fetch(`${lanBase}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      remoteAuthed.ok,
      `M13 LAN GET /api/users com token operator: ${remoteAuthed.status}`,
    );
  } else {
    console.warn('M13 LAN: sem IPv4 — skip teste remoto (loopback coberto)');
  }

  const spoofed = await fetch(`${loopback}/api/users`, {
    headers: { 'X-Forwarded-For': '10.0.0.99' },
  });
  assert(spoofed.ok, 'M13: X-Forwarded-For não remove bypass loopback');

  console.log('Smoke CAD-128 OK (M13 /api/users loopback vs LAN)');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
