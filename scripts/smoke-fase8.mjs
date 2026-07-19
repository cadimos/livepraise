#!/usr/bin/env node
/**
 * Smoke Fase 8: instalação limpa + 6 ações socket + latência (CA-R02–R03, CA-R05, CA-R07).
 */
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import {
  assert,
  cleanupSmokeHome,
  configureSmokeEnv,
  createSmokeHome,
  loadLivepraiseServer,
  resolveAppRoot,
} from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const testHome = createSmokeHome('livepraise-smoke-f8-');

/** Seis ações core do protocolo live (subset da baseline Fase 3). */
const SMOKE_SOCKET_ACTIONS = [
  { acao: 'background', valor: encodeURIComponent('/imagens/smoke-f8.jpg') },
  { acao: 'texto', valor: 'smoke-f8-texto' },
  { acao: 'video', valor: encodeURIComponent('/videos/smoke/smoke-f8.mp4') },
  { acao: 'viewMusica', valor: '<p>smoke-f8 louvor</p>' },
  { acao: 'viewBiblia', valor: '<p>smoke-f8 biblia</p>' },
  { acao: 'removeConteudo', valor: '' },
];

configureSmokeEnv({ home: testHome, appRoot, port: '0' });

const { startLivepraiseServer, stopLivepraiseServer } = await loadLivepraiseServer(appRoot);

function seedSmokeMedia(homeDir) {
  const imagePath = path.join(homeDir, 'livepraise', 'imagens', 'smoke-f8.jpg');
  const videoPath = path.join(homeDir, 'livepraise', 'videos', 'smoke', 'smoke-f8.mp4');
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.mkdirSync(path.dirname(videoPath), { recursive: true });
  if (!fs.existsSync(imagePath)) fs.writeFileSync(imagePath, 'smoke');
  if (!fs.existsSync(videoPath)) fs.writeFileSync(videoPath, 'smoke');
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

function connectClient(port, role, name, timeoutMs = 10_000) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timeout WebSocket ${role} (${timeoutMs}ms)`));
    }, timeoutMs);

    ws.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.once('open', () => {
      ws.send(JSON.stringify({ type: 'join', role, name }));
    });

    waitForMessage(ws, (m) => m.type === 'joined', timeoutMs)
      .then(() => {
        clearTimeout(timer);
        resolve(ws);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sendAction(ws, action) {
  ws.send(JSON.stringify({ type: 'live-action', action }));
}

let operator;
let projector;

try {
  seedSmokeMedia(testHome);

  const dbPath = path.join(testHome, 'livepraise', 'dsw.bd');
  assert(!fs.existsSync(dbPath), 'instalação limpa: BD ausente antes do bootstrap');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  assert(fs.existsSync(dbPath), 'CA-05: bootstrap criou dsw.bd em instalação limpa');

  const health = await fetch(`${base}/health`, {
    signal: AbortSignal.timeout(10_000),
  }).then((r) => r.json());
  assert(health.phase === 'release', 'health phase release');
  assert(health.status === 'ok', 'health ok');

  operator = await connectClient(port, 'operator', 'Operador');
  projector = await connectClient(port, 'projector', 'Projetor');

  const latencyStart = Date.now();
  sendAction(operator, SMOKE_SOCKET_ACTIONS[0]);

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
    decodeURIComponent(firstMsg.action.valor).includes('smoke-f8.jpg'),
    'payload background preservado',
  );

  const received = new Set(['background']);
  for (const action of SMOKE_SOCKET_ACTIONS.slice(1)) {
    sendAction(operator, action);
    const msg = await waitForMessage(
      projector,
      (m) => m.type === 'live-action' && m.action?.acao === action.acao,
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
} finally {
  operator?.close();
  projector?.close();
  await stopLivepraiseServer().catch(() => {});
  cleanupSmokeHome(testHome);
}
