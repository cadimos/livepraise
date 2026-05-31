#!/usr/bin/env node
/**
 * Smoke Fase 4: UI operador Vue 3 + Tailwind servida + projeção louvor (CA-R09).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-f4-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

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
  const operatorIndex = path.join(appRoot, 'dist/apps/operator/index.html');
  assert(fs.existsSync(operatorIndex), 'build:operator deve gerar dist/apps/operator/index.html');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  const operatorPhases = new Set([
    'fase-4-operator',
    'fase-5-displays',
    'fase-6-themes-i18n',
    'fase-7-network',
    'fase-8-release',
  ]);
  assert(
    operatorPhases.has(health.phase),
    `health phase operador (got ${health.phase})`,
  );

  const operatorRes = await fetch(`${base}/operator/`);
  assert(operatorRes.ok, 'GET /operator/ deve responder 200');
  const operatorHtml = await operatorRes.text();
  assert(operatorHtml.includes('id="app"'), 'SPA operador servida em /operator/');

  const projector = await connectClient(port, 'projector', 'Projetor');
  const operator = await connectClient(port, 'operator', 'Operador');

  const properHtml = `<div class="titulo"></div>
<div class="content"><span>Linha um<br />Linha dois</span></div>
<div class="rodape">Fase4 Smoke (Cadimos)</div>`;

  sendAction(operator, {
    acao: 'viewMusica',
    valor: properHtml,
  });

  const liveMsg = await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  assert(
    liveMsg.action.valor.includes('Fase4 Smoke'),
    'operador projeta louvor via WebSocket',
  );

  console.log('Smoke Fase 4 OK (operator UI + viewMusica)');

  projector.close();
  operator.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
