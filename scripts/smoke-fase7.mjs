#!/usr/bin/env node
/**
 * Smoke Fase 7: auth, usuários, fila aprovação, chrome tabs, /live público (CA-R11–R14, R18–R21, R24).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-f7-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-admin-pass';

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
      reject(new Error(`Timeout aguardando mensagem (${timeoutMs}ms)`));
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

async function joinClient(port, role, name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(JSON.stringify({ type: 'join', role, name }));
  await waitForMessage(ws, (m) => m.type === 'joined');
  return ws;
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
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert(health.phase === 'fase-8-release', 'health phase fase-8');

  const portal = await fetch(`${base}/`);
  assert(portal.ok, 'GET / portal');
  assert((await portal.text()).includes('portal.js'), 'portal servido em /');

  const livePage = await fetch(`${base}/live/`);
  assert(livePage.ok, 'CA-R18: GET /live/ sem auth');
  assert((await livePage.text()).includes('live.js'), 'live mirror servido');

  assert((await fetch(`${base}/remote/`)).ok, 'GET /remote/');

  const adminToken = await login(base, 'admin', 'smoke-admin-pass');

  const createRemote = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: 'remoto1',
      password: 'remoto123',
      role: 'remote',
    }),
  });
  const remoteUser = await createRemote.json();
  assert(createRemote.ok, `CA-R11: criar usuário remoto — ${remoteUser.error}`);

  const usersList = await fetch(`${base}/api/users`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  }).then((r) => r.json());
  assert(
    usersList.users.some((u) => u.username === 'remoto1'),
    'CA-R11: usuário persiste em SQLite',
  );

  const remoteToken = await login(base, 'remoto1', 'remoto123');

  const tabRes = await fetch(`${base}/api/remote/chrome-tab`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${remoteToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ label: 'Hino smoke', songName: 'Teste' }),
  });
  const tabData = await tabRes.json();
  assert(tabRes.ok, `CA-R14: chrome tab — ${tabData.error}`);

  const tabs = await fetch(`${base}/api/remote/chrome-tabs`).then((r) => r.json());
  assert(tabs.tabs.length >= 1, 'operador local vê chrome tabs remotas');

  const musicHtml =
    '<div class="content"><span>Só letra</span></div><div class="rodape">Artista</div>';
  const approvalRes = await fetch(`${base}/api/remote/live-request`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${remoteToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'live-music',
      payload: { html: musicHtml },
    }),
  });
  const approvalData = await approvalRes.json();
  assert(approvalRes.status === 202, 'CA-R12: pedido live entra na fila');

  const pending = await fetch(`${base}/api/remote/approvals/pending`).then((r) =>
    r.json(),
  );
  assert(pending.items.length >= 1, 'fila de aprovação visível ao operador');

  const liveWs = await joinClient(port, 'live-viewer', 'Live');
  const projectorWs = await joinClient(port, 'projector', 'Projetor');

  const liveMsgPromise = waitForMessage(
    liveWs,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  const approveRes = await fetch(
    `${base}/api/remote/approvals/${approvalData.approval.id}/approve`,
    { method: 'POST' },
  );
  assert(approveRes.ok, 'aprovação operador local');

  const liveMsg = await liveMsgPromise;
  assert(
    liveMsg.action.valor.includes('Só letra'),
    'CA-R18: /live recebe conteúdo aprovado',
  );

  const operatorWs = await joinClient(port, 'operator', 'Operador');
  operatorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: {
        acao: 'background',
        valor: encodeURIComponent('http://127.0.0.1/bg.jpg'),
      },
    }),
  );

  let liveGotBackground = false;
  liveWs.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'live-action' && msg.action?.acao === 'background') {
      liveGotBackground = true;
    }
  });

  await new Promise((r) => setTimeout(r, 300));
  assert(!liveGotBackground, 'CA-R21: /live omite fundo (background)');

  console.log('Smoke Fase 7 OK (auth, usuários, aprovação, chrome tabs, /live)');

  liveWs.close();
  projectorWs.close();
  operatorWs.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
