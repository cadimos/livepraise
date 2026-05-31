#!/usr/bin/env node
/**
 * Smoke CAD-193: fundo de projeção persiste após reinício do servidor.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad193-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

const MEDIA_VALOR = encodeURIComponent('/imagens/smoke-cad193.jpg');
const SNAPSHOT_PATH = path.join(testHome, 'livepraise', 'projection-background.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function waitForMessage(socket, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timeout à espera de mensagem WS'));
    }, timeoutMs);

    function onMessage(data) {
      let message;
      try {
        message = JSON.parse(String(data));
      } catch {
        return;
      }
      if (!predicate(message)) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      resolve(message);
    }

    socket.on('message', onMessage);
  });
}

async function connect(role) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
  socket.send(JSON.stringify({ type: 'join', role, name: 'smoke-cad193' }));
  const joined = await waitForMessage(socket, (m) => m.type === 'joined');
  return { socket, joined };
}

let port;

try {
  ({ port } = await startLivepraiseServer(0));

  const { socket: operator } = await connect('operator');
  const { socket: projector } = await connect('projector');
  const projectorLive = waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'background',
  );
  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'background', valor: MEDIA_VALOR },
    }),
  );
  await projectorLive;

  assert(fs.existsSync(SNAPSHOT_PATH), 'snapshot gravado em disco');

  const { socket: projectorJoin, joined: joinedBeforeRestart } =
    await connect('projector');
  assert(
    joinedBeforeRestart.state?.lastAction?.acao === 'background',
    'lastAction background antes do restart',
  );
  assert(
    joinedBeforeRestart.state?.lastAction?.valor === MEDIA_VALOR,
    'valor do fundo antes do restart',
  );

  operator.close();
  projector.close();
  projectorJoin.close();
  await stopLivepraiseServer();
  ({ port } = await startLivepraiseServer(0));

  const { socket: projectorAfter, joined: joinedAfterRestart } =
    await connect('projector');
  assert(
    joinedAfterRestart.state?.lastAction?.acao === 'background',
    'lastAction background após restart',
  );
  assert(
    joinedAfterRestart.state?.lastAction?.valor === MEDIA_VALOR,
    'valor do fundo após restart',
  );

  projectorAfter.close();
  console.log('smoke-cad193: OK');
} finally {
  await stopLivepraiseServer().catch(() => {});
  fs.rmSync(testHome, { recursive: true, force: true });
}
