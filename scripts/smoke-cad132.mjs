#!/usr/bin/env node
/**
 * Smoke CAD-132: /live activo (sem redirect), perfil live, barra de status via device-presence.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad132-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad132-pass';

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
      reject(new Error(`Timeout (${timeoutMs}ms)`));
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

async function joinExternal(port, profile, deviceId) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(
    JSON.stringify({
      type: 'join',
      role: 'external-display',
      name: profile,
      deviceId,
      profile,
      showChords: false,
    }),
  );
  await waitForMessage(ws, (m) => m.type === 'joined');
  return ws;
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const livePage = await fetch(`${base}/live/`);
  assert(livePage.ok, 'CA-R18: GET /live/ sem redirect');
  const liveHtml = await livePage.text();
  assert(liveHtml.includes('live.js'), '/live/ serve web/live');

  const liveNoRedirect = await fetch(`${base}/live/`, { redirect: 'manual' });
  assert(liveNoRedirect.status === 200, '/live/ não redirecciona para /vocal');

  const stageRedirect = await fetch(`${base}/stage-return/`, {
    redirect: 'manual',
  });
  assert(stageRedirect.status === 302, '/stage-return/ redirect 302');
  assert(
    stageRedirect.headers.get('location')?.includes('/stage'),
    '/stage-return/ → /stage/',
  );

  const deviceId = randomUUID();
  const register = await fetch(`${base}/api/devices/${deviceId}?profile=live`);
  assert(register.ok, 'GET /api/devices aceita profile=live');
  const regBody = await register.json();
  assert(regBody.device.profile === 'live', 'profile live persistido');

  const operatorWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((r) => operatorWs.once('open', r));
  operatorWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Op' }));
  await waitForMessage(operatorWs, (m) => m.type === 'joined');

  const livePresencePromise = waitForMessage(
    operatorWs,
    (m) =>
      m.type === 'device-presence' &&
      m.event === 'online' &&
      m.device?.profile === 'live',
  );

  const liveWs = await joinExternal(port, 'live', deviceId);
  const livePresence = await livePresencePromise;
  assert(livePresence.device.deviceId === deviceId, 'operador vê /live online');

  const vocalPresencePromise = waitForMessage(
    operatorWs,
    (m) =>
      m.type === 'device-presence' &&
      m.event === 'online' &&
      m.device?.profile === 'vocal',
  );
  const vocalWs = await joinExternal(port, 'vocal', randomUUID());
  await vocalPresencePromise;

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

  await new Promise((r) => setTimeout(r, 250));
  assert(!liveGotBackground, 'CA-R21: perfil live omite background');

  liveWs.close();
  vocalWs.close();
  operatorWs.close();

  console.log('Smoke CAD-132 OK');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
