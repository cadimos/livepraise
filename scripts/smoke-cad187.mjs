#!/usr/bin/env node
/**
 * Smoke CAD-187: contador/timer de culto via WebSocket serviceTimer.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad187-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { LIVE_ACTIONS } = await import('../dist/shared/types/live.js');
const {
  encodeServiceTimerState,
  parseServiceTimerState,
} = await import('../dist/shared/service-timer.js');

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

try {
  assert(LIVE_ACTIONS.includes('serviceTimer'), 'serviceTimer em LIVE_ACTIONS');

  const { port } = await startLivepraiseServer(0);
  const base = `ws://127.0.0.1:${port}/ws/live`;

  const operator = new WebSocket(base);
  await new Promise((resolve, reject) => {
    operator.once('open', resolve);
    operator.once('error', reject);
  });
  operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'smoke' }));
  await waitForMessage(operator, (m) => m.type === 'joined');

  const projector = new WebSocket(base);
  await new Promise((resolve, reject) => {
    projector.once('open', resolve);
    projector.once('error', reject);
  });
  projector.send(JSON.stringify({ type: 'join', role: 'projector', name: 'p1' }));
  await waitForMessage(projector, (m) => m.type === 'joined');

  const payload = encodeServiceTimerState({
    version: 1,
    active: true,
    running: true,
    startedAt: Date.now(),
    accumulatedMs: 0,
    timerDurationMs: 5 * 60 * 1000,
    targets: [{ kind: 'display', id: '99', mode: 'counter' }],
  });

  const parsed = parseServiceTimerState(JSON.parse(payload));
  assert(parsed?.active === true, 'parseServiceTimerState');

  const broadcastPromise = waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'serviceTimer',
  );

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'serviceTimer', valor: payload },
    }),
  );

  const received = await broadcastPromise;
  assert(received.action.valor.includes('"active":true'), 'projetor recebeu serviceTimer');

  const stage = new WebSocket(base);
  await new Promise((resolve, reject) => {
    stage.once('open', resolve);
    stage.once('error', reject);
  });
  stage.send(JSON.stringify({ type: 'join', role: 'stage-return', name: 'stage' }));
  const joinedStage = await waitForMessage(stage, (m) => m.type === 'joined');
  assert(
    joinedStage.state?.lastAction?.acao === 'serviceTimer' ||
      joinedStage.state?.lastAction === null,
    'stage-return join com replay de timer quando activo',
  );

  console.log('Smoke CAD-187 OK');
  operator.close();
  projector.close();
  stage.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
