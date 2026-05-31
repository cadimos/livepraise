#!/usr/bin/env node
/**
 * Smoke Fase 3: WebSocket live hub + paridade de ações + latência LAN (CA-R05, CA-R08).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-f3-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { BASELINE_ACTION_SET } = await import('../dist/core/projection/index.js');

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
  const { port } = await startLivepraiseServer(0);

  const projector = await connectClient(port, 'projector', 'Projetor');
  const operator = await connectClient(port, 'operator', 'Monitor');

  const latencyStart = Date.now();
  sendAction(operator, {
    acao: 'background',
    valor: encodeURIComponent('http://127.0.0.1/test.jpg'),
  });

  const liveMsg = await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'background',
  );
  const latency = Date.now() - latencyStart;

  assert(
    latency <= 500,
    `CA-R05: latência operador→projetor ${latency}ms (meta ≤500ms)`,
  );
  assert(
    liveMsg.action.valor.includes('test.jpg'),
    'payload background preservado',
  );

  const received = new Set();
  for (const acao of BASELINE_ACTION_SET) {
    sendAction(operator, { acao, valor: `smoke-${acao}` });
    const msg = await waitForMessage(
      projector,
      (m) => m.type === 'live-action' && m.action?.acao === acao,
    );
    received.add(msg.action.acao);
  }

  assert(
    received.size === BASELINE_ACTION_SET.length,
    `Paridade ações: ${received.size}/${BASELINE_ACTION_SET.length}`,
  );

  const health = await fetch(`http://127.0.0.1:${port}/health`).then((r) =>
    r.json(),
  );
  assert(health.websocket === '/ws/live', 'health expõe websocket /ws/live');

  console.log(`Smoke Fase 3 OK (latência ${latency}ms, ${received.size} ações)`);

  projector.close();
  operator.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
