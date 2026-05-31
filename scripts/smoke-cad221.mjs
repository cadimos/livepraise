#!/usr/bin/env node
/**
 * Smoke CAD-221 / CAD-226: filtragem partilhada de entrega + frame de prévia por grupo.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad221-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const {
  effectiveDeliveryAction,
  shouldDeliver,
} = await import('../dist/shared/live-delivery.js');
const {
  applyLiveActionToPreviewFrame,
  EMPTY_OUTPUT_PREVIEW_FRAME,
} = await import('../dist/shared/output-preview.js');

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
  // CA-R21: live não recebe background
  assert(
    !shouldDeliver('external-display', { acao: 'background', valor: '/imagens/x.jpg' }, 'live'),
    'live skip background',
  );
  const cleared = effectiveDeliveryAction(
    'external-display',
    { acao: 'background', valor: '/imagens/x.jpg' },
    'live',
  );
  assert(cleared?.acao === 'limparFundo', 'live recebe limparFundo em vez de background');

  let liveFrame = { ...EMPTY_OUTPUT_PREVIEW_FRAME };
  liveFrame = applyLiveActionToPreviewFrame(liveFrame, {
    acao: 'viewMusica',
    valor: '<div class="content">A</div>',
  });
  assert(liveFrame.contentHtml.includes('A'), 'frame aplica viewMusica');

  const { port } = await startLivepraiseServer(0);
  const base = `ws://127.0.0.1:${port}/ws/live`;

  const operator = new WebSocket(base);
  await new Promise((resolve, reject) => {
    operator.once('open', resolve);
    operator.once('error', reject);
  });
  operator.send(JSON.stringify({ type: 'join', role: 'operator', name: 'smoke' }));
  await waitForMessage(operator, (m) => m.type === 'joined');

  const liveClient = new WebSocket(base);
  await new Promise((resolve, reject) => {
    liveClient.once('open', resolve);
    liveClient.once('error', reject);
  });
  liveClient.send(
    JSON.stringify({
      type: 'join',
      role: 'external-display',
      name: 'live1',
      deviceId: '11111111-1111-4111-8111-111111111111',
      profile: 'live',
    }),
  );
  await waitForMessage(liveClient, (m) => m.type === 'joined');

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'background', valor: encodeURIComponent('/imagens/test.jpg') },
    }),
  );

  const liveMsg = await waitForMessage(
    liveClient,
    (m) => m.type === 'live-action' && m.action?.acao === 'limparFundo',
  );
  assert(liveMsg.action.acao === 'limparFundo', 'hub envia limparFundo ao perfil live');

  const projector = new WebSocket(base);
  await new Promise((resolve, reject) => {
    projector.once('open', resolve);
    projector.once('error', reject);
  });
  projector.send(JSON.stringify({ type: 'join', role: 'projector', name: 'p1' }));
  await waitForMessage(projector, (m) => m.type === 'joined');

  operator.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'viewMusica', valor: '<div>smoke</div>' },
    }),
  );
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  console.log('smoke-cad221: OK');
} finally {
  await stopLivepraiseServer().catch(() => {});
  fs.rmSync(testHome, { recursive: true, force: true });
}
