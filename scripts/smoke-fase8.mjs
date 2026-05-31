#!/usr/bin/env node
/**
 * Smoke Fase 8: instalação limpa + 6 ações socket + latência (CA-R02–R03, CA-R05, CA-R07).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-f8-'));

/** Seis ações core do protocolo live (subset da baseline Fase 3). */
const SMOKE_SOCKET_ACTIONS = [
  'background',
  'texto',
  'video',
  'viewMusica',
  'viewBiblia',
  'removeConteudo',
];

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function waitForMessage(ws, predicate, timeoutMs = 3000) {
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

function connectClient(port, role, name) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  return new Promise((resolve, reject) => {
    ws.once('open', () => {
      ws.send(JSON.stringify({ type: 'join', role, name }));
    });
    waitForMessage(ws, (m) => m.type === 'joined')
      .then(() => resolve(ws))
      .catch(reject);
  });
}

function sendAction(ws, action) {
  ws.send(JSON.stringify({ type: 'live-action', action }));
}

try {
  const dbPath = path.join(testHome, 'livepraise', 'dsw.bd');
  assert(!fs.existsSync(dbPath), 'instalação limpa: BD ausente antes do bootstrap');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  assert(fs.existsSync(dbPath), 'CA-05: bootstrap criou dsw.bd em instalação limpa');

  const health = await fetch(`${base}/health`).then((r) => r.json());
  assert(health.phase === 'release', 'health phase release');
  assert(health.status === 'ok', 'health ok');

  const operator = await connectClient(port, 'operator', 'Operador');
  const projector = await connectClient(port, 'projector', 'Projetor');

  const latencyStart = Date.now();
  sendAction(operator, {
    acao: 'background',
    valor: encodeURIComponent('http://127.0.0.1/smoke-f8.jpg'),
  });

  const firstMsg = await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'background',
  );
  const latency = Date.now() - latencyStart;

  assert(
    latency <= 500,
    `CA-R05: latência operador→projetor ${latency}ms (meta ≤500ms)`,
  );
  assert(
    firstMsg.action.valor.includes('smoke-f8.jpg'),
    'payload background preservado',
  );

  const received = new Set();
  for (const acao of SMOKE_SOCKET_ACTIONS) {
    sendAction(operator, { acao, valor: `smoke-f8-${acao}` });
    const msg = await waitForMessage(
      projector,
      (m) => m.type === 'live-action' && m.action?.acao === acao,
    );
    received.add(msg.action.acao);
  }

  assert(
    received.size === SMOKE_SOCKET_ACTIONS.length,
    `6 ações socket: ${received.size}/${SMOKE_SOCKET_ACTIONS.length}`,
  );

  console.log(
    `Smoke Fase 8 OK (instalação limpa, latência ${latency}ms, ${received.size} ações)`,
  );

  operator.close();
  projector.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
