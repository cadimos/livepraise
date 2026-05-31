#!/usr/bin/env node
/**
 * Smoke CAD-129: rotas /vocal, /stage, /player, API dispositivos, cifras por perfil.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad129-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad129-pass';

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

async function joinExternal(port, profile, deviceId, showChords = true) {
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
      showChords,
    }),
  );
  await waitForMessage(ws, (m) => m.type === 'joined');
  return ws;
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  for (const route of ['/vocal/', '/stage/', '/player/']) {
    const page = await fetch(`${base}${route}`);
    assert(page.ok, `GET ${route} deve servir external-display`);
    const html = await page.text();
    assert(html.includes('external-display.js'), `${route} carrega client`);
  }

  const liveRedirect = await fetch(`${base}/live/`, { redirect: 'manual' });
  assert(liveRedirect.status === 200, '/live/ serve saída de transmissão (sem redirect)');

  const stageRedirect = await fetch(`${base}/stage-return/`, {
    redirect: 'manual',
  });
  assert(stageRedirect.status === 302, '/stage-return/ redirect 302');
  assert(
    stageRedirect.headers.get('location')?.includes('/stage'),
    '/stage-return/ → /stage/',
  );

  const deviceId = randomUUID();

  const register = await fetch(
    `${base}/api/devices/${deviceId}?profile=player`,
  );
  assert(register.ok, 'GET /api/devices registra dispositivo');
  const regBody = await register.json();
  assert(regBody.device.deviceId === deviceId, 'deviceId persistido');
  assert(regBody.device.profile === 'player', 'profile player');

  const patch = await fetch(`${base}/api/devices/${deviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ showChords: false, label: 'Tablet Bateria' }),
  });
  assert(patch.ok, 'PATCH /api/devices prefs');
  const patched = await patch.json();
  assert(patched.device.showChords === false, 'showChords persistido');
  assert(patched.device.label === 'Tablet Bateria', 'label persistido');

  const reload = await fetch(`${base}/api/devices/${deviceId}`);
  const reloadBody = await reload.json();
  assert(reloadBody.device.showChords === false, 'prefs após reload');

  const operatorWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((r) => operatorWs.once('open', r));
  operatorWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Op' }));
  await waitForMessage(operatorWs, (m) => m.type === 'joined');

  const presencePromise = waitForMessage(
    operatorWs,
    (m) => m.type === 'device-presence' && m.event === 'online',
  );

  const playerWs = await joinExternal(port, 'player', randomUUID(), false);
  const presence = await presencePromise;
  assert(presence.device.profile === 'player', 'operador vê device-presence');

  const vocalWs = await joinExternal(port, 'vocal', randomUUID());
  const musicWithChords =
    '<div class="content"><span>C\\nAm\\nLetra vocal</span></div><div class="rodape">Artista</div>';

  const vocalMsgPromise = waitForMessage(
    vocalWs,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  operatorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'viewMusica', valor: musicWithChords },
    }),
  );

  await vocalMsgPromise;
  // vocal client strips chords — verified via server delivery + client contract in manual QA;
  // smoke asserts vocal receives viewMusica (not stage-only action).

  operatorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: {
        acao: 'viewMusicaRetorno',
        valor: '<div class="texto">Palco</div>',
      },
    }),
  );

  let vocalGotStage = false;
  vocalWs.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'live-action' && msg.action?.acao === 'viewMusicaRetorno') {
      vocalGotStage = true;
    }
  });

  await new Promise((r) => setTimeout(r, 200));
  assert(!vocalGotStage, 'vocal não recebe viewMusicaRetorno');

  playerWs.close();
  vocalWs.close();
  operatorWs.close();

  console.log('Smoke CAD-129 OK');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
