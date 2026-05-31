#!/usr/bin/env node
/**
 * Smoke CAD-188: alerta com marquee no rodapé via WebSocket footerAlert.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad188-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { LIVE_ACTIONS } = await import('../dist/shared/types/live.js');
const {
  encodeFooterAlertState,
  parseFooterAlertState,
} = await import('../dist/shared/footer-alert.js');

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
  assert(LIVE_ACTIONS.includes('footerAlert'), 'footerAlert em LIVE_ACTIONS');

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

  const payload = encodeFooterAlertState({
    version: 1,
    active: true,
    text: 'Teste CAD-188',
    repeatCount: 2,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    scrollDurationSec: 3,
    targets: [],
  });

  const parsed = parseFooterAlertState(JSON.parse(payload));
  assert(parsed?.active === true && parsed.text === 'Teste CAD-188', 'parseFooterAlertState');

  const broadcastPromise = waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'footerAlert',
  );

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'footerAlert', valor: payload },
    }),
  );

  const received = await broadcastPromise;
  assert(received.action.valor.includes('Teste CAD-188'), 'projetor recebeu footerAlert');

  const stopPayload = encodeFooterAlertState({
    version: 1,
    active: false,
    text: '',
    repeatCount: 3,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    scrollDurationSec: 3,
    targets: [],
  });

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'footerAlert', valor: stopPayload },
    }),
  );

  console.log('Smoke CAD-188 OK');
  operator.close();
  projector.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
