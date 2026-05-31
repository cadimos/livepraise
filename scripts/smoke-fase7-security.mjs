#!/usr/bin/env node
/**
 * Smoke segurança Fase 7 — regressão B1–B4 (CAD-91).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-sec-f7-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
delete process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD;

const { isLoopbackAddress } = await import('../dist/server/middleware/client-ip.js');
const { getLastBootstrapAdmin } = await import('../dist/core/auth/users.js');
const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function waitForMessage(ws, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.off('message', onMessage);
      reject(new Error(`Timeout (${timeoutMs}ms): ${message}`));
    }, timeoutMs);

    function onMessage(data) {
      const msg = JSON.parse(data.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    }

    ws.on('message', onMessage);
  });
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

function firstLanIpv4() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return null;
}

try {
  // B2 — loopback estrito (sem sufixo)
  assert(!isLoopbackAddress('10.127.0.0.1'), 'B2: 10.127.0.0.1 não é loopback');
  assert(isLoopbackAddress('127.0.0.1'), 'B2: 127.0.0.1 é loopback');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  // B3 — bootstrap sem changeme fixo
  const bootstrap = getLastBootstrapAdmin();
  assert(bootstrap, 'B3: admin bootstrap criado');
  assert(bootstrap.password !== 'changeme', 'B3: password não é changeme');
  // B2 — spoof X-Forwarded-For não altera isenção local (socket loopback)
  const localBypass = await fetch(`${base}/api/remote/approvals/pending`, {
    headers: { 'X-Forwarded-For': '10.127.0.0.1' },
  });
  assert(localBypass.ok, 'B2: operador local mantém acesso apesar de XFF enganoso');

  let changemeRejected = false;
  try {
    await login(base, 'admin', 'changeme');
  } catch {
    changemeRejected = true;
  }
  assert(changemeRejected, 'B3: changeme rejeitado');

  const adminToken = await login(base, bootstrap.username, bootstrap.password);
  const traversal = await fetch(`${base}/biblias/livros/..%2F..%2Fetc%2Fpasswd`);
  assert(traversal.status === 400, 'B4: path traversal rejeitado');

  // B1 — operador local (loopback) sem token continua OK
  const localWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    localWs.once('open', resolve);
    localWs.once('error', reject);
  });
  localWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Local' }));
  await waitForMessage(localWs, (m) => m.type === 'joined');
  localWs.close();

  // B1 — operador em rede exige token
  const lanIp = firstLanIpv4();
  if (lanIp) {
    const remoteWs = new WebSocket(`ws://${lanIp}:${port}/ws/live`);
    await new Promise((resolve, reject) => {
      remoteWs.once('open', resolve);
      remoteWs.once('error', reject);
    });

    let remoteClosed = false;
    remoteWs.on('close', () => {
      remoteClosed = true;
    });
    remoteWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Remoto' }));
    await waitForMessage(remoteWs, (m) => m.type === 'error' || m.type === 'joined');
    await new Promise((r) => setTimeout(r, 200));
    assert(remoteClosed, 'B1: operador remoto sem token é fechado');

    const authedWs = new WebSocket(`ws://${lanIp}:${port}/ws/live`);
    await new Promise((resolve, reject) => {
      authedWs.once('open', resolve);
      authedWs.once('error', reject);
    });
    authedWs.send(
      JSON.stringify({ type: 'join', role: 'operator', name: 'Remoto', token: adminToken }),
    );
    await waitForMessage(authedWs, (m) => m.type === 'joined');
    authedWs.close();
  } else {
    console.warn('B1 rede: sem IPv4 LAN — skip join remoto (loopback coberto)');
  }

  // M2 — script removido da fila
  const remoteCreate = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'remoto-sec',
      password: 'remoto-sec-pass',
      role: 'remote',
    }),
  });
  assert(remoteCreate.ok, 'criar usuário remoto para M2');
  const remoteToken = await login(base, 'remoto-sec', 'remoto-sec-pass');
  const xssHtml =
    '<div>ok</motion><script>alert(1)</script><span onload="x">x</span></motion>';
  const reqRes = await fetch(`${base}/api/remote/live-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${remoteToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ kind: 'live-music', payload: { html: xssHtml } }),
  });
  assert(reqRes.status === 202, 'M2: pedido enfileirado');
  const pending = await fetch(`${base}/api/remote/approvals/pending`).then((r) =>
    r.json(),
  );
  const item = pending.items.find((i) => i.userName === 'remoto-sec');
  assert(item, 'M2: item na fila');
  const html = String(item.payload.html ?? '');
  assert(!html.includes('<script'), 'M2: script removido');
  assert(!html.includes('onload='), 'M2: handlers removidos');

  // A5 — projector não pode publicar live-action
  const projectorWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    projectorWs.once('open', resolve);
    projectorWs.once('error', reject);
  });
  projectorWs.send(JSON.stringify({ type: 'join', role: 'projector', name: 'Proj' }));
  await waitForMessage(projectorWs, (m) => m.type === 'joined');
  let projectorPublishRejected = false;
  projectorWs.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'error' && /operador/i.test(msg.message ?? '')) {
      projectorPublishRejected = true;
    }
  });
  projectorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'texto', valor: encodeURIComponent('hack') },
    }),
  );
  await new Promise((r) => setTimeout(r, 300));
  assert(projectorPublishRejected, 'A5: projector não publica live-action');
  projectorWs.close();

  // A5 — operador loopback continua OK (projector recebe o broadcast)
  const opWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  const projListener = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await Promise.all([
    new Promise((resolve, reject) => {
      opWs.once('open', resolve);
      opWs.once('error', reject);
    }),
    new Promise((resolve, reject) => {
      projListener.once('open', resolve);
      projListener.once('error', reject);
    }),
  ]);
  opWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Op' }));
  await waitForMessage(opWs, (m) => m.type === 'joined');
  projListener.send(JSON.stringify({ type: 'join', role: 'projector', name: 'ProjListen' }));
  await waitForMessage(projListener, (m) => m.type === 'joined');
  opWs.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'texto', valor: encodeURIComponent('ok') },
    }),
  );
  await waitForMessage(
    projListener,
    (m) => m.type === 'live-action' && m.action?.acao === 'texto',
  );
  opWs.close();
  projListener.close();

  // A6 — background com URL externa rejeitado
  const opBg = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    opBg.once('open', resolve);
    opBg.once('error', reject);
  });
  opBg.send(JSON.stringify({ type: 'join', role: 'operator', name: 'OpBg' }));
  await waitForMessage(opBg, (m) => m.type === 'joined');
  let bgRejected = false;
  opBg.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'error' && /não permitido/i.test(msg.message ?? '')) {
      bgRejected = true;
    }
  });
  opBg.send(
    JSON.stringify({
      type: 'live-action',
      action: {
        acao: 'background',
        valor: encodeURIComponent('https://evil.example/x.jpg'),
      },
    }),
  );
  await new Promise((r) => setTimeout(r, 300));
  assert(bgRejected, 'A6: background com host externo rejeitado');
  opBg.close();

  // A3 — XSS em viewMusica sanitizado na origem
  const opXss = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    opXss.once('open', resolve);
    opXss.once('error', reject);
  });
  const listener = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    listener.once('open', resolve);
    listener.once('error', reject);
  });
  opXss.send(JSON.stringify({ type: 'join', role: 'operator', name: 'OpXss' }));
  await waitForMessage(opXss, (m) => m.type === 'joined');
  listener.send(JSON.stringify({ type: 'join', role: 'projector', name: 'ProjXss' }));
  await waitForMessage(listener, (m) => m.type === 'joined');
  const xssPayload =
    '<p>ok</p><script>alert(1)</script><span onload="x">x</span>';
  opXss.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'viewMusica', valor: xssPayload },
    }),
  );
  const xssBroadcast = await waitForMessage(
    listener,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );
  const safeHtml = String(xssBroadcast.action.valor ?? '');
  assert(!safeHtml.includes('<script'), 'A3: script removido em viewMusica');
  assert(!safeHtml.includes('onload='), 'A3: handlers removidos em viewMusica');
  opXss.close();
  listener.close();

  console.log('Smoke segurança Fase 7 OK (B1–B4 + M2 + A5/A6/A3)');

  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
