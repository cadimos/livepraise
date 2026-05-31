#!/usr/bin/env node
/**
 * Smoke CAD-137: rota /live permanente (transmissão) — CA-R18, CA-R27, CA-R22.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad137-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad137-pass';

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

async function joinLive(port, deviceId) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(
    JSON.stringify({
      type: 'join',
      role: 'external-display',
      name: 'live',
      deviceId,
      profile: 'live',
      showChords: false,
    }),
  );
  await waitForMessage(ws, (m) => m.type === 'joined');
  return ws;
}

const sockets = [];

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const liveRes = await fetch(`${base}/live/`, { redirect: 'manual' });
  assert(liveRes.status === 200, 'CA-R18: GET /live/ retorna 200 (sem redirect)');
  const liveHtml = await liveRes.text();
  assert(liveHtml.includes('live.js'), 'CA-R18: /live/ serve web/live/');

  const stageRedirect = await fetch(`${base}/stage-return/`, { redirect: 'manual' });
  assert(stageRedirect.status === 302, 'CA-R27: /stage-return/ redirect 302');
  assert(
    stageRedirect.headers.get('location')?.includes('/stage'),
    'CA-R27: /stage-return/ → /stage/',
  );

  const vocalRes = await fetch(`${base}/vocal/`, { redirect: 'manual' });
  assert(vocalRes.status === 200, 'CA-R27: /vocal/ rota distinta de /live/');

  const deviceId = randomUUID();
  const register = await fetch(`${base}/api/devices/${deviceId}?profile=live`);
  assert(register.ok, 'profile=live aceito em /api/devices');
  const regBody = await register.json();
  assert(regBody.device.profile === 'live', 'profile live persistido');

  const operatorWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  sockets.push(operatorWs);
  await new Promise((r) => operatorWs.once('open', r));
  operatorWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Op' }));
  await waitForMessage(operatorWs, (m) => m.type === 'joined');

  const liveWs = await joinLive(port, deviceId);
  sockets.push(liveWs);

  let liveGotBackground = false;
  let liveGotVideo = false;
  liveWs.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type !== 'live-action') return;
    if (msg.action?.acao === 'background') liveGotBackground = true;
    if (msg.action?.acao === 'video') liveGotVideo = true;
  });

  operatorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'background', valor: encodeURIComponent('/imagens/bg.jpg') },
    }),
  );
  await new Promise((r) => setTimeout(r, 250));
  assert(!liveGotBackground, 'CA-R22: perfil live omite background');

  operatorWs.send(
    JSON.stringify({
      type: 'live-action',
      action: { acao: 'video', valor: encodeURIComponent('/videos/content.mp4') },
    }),
  );
  await new Promise((r) => setTimeout(r, 250));
  assert(liveGotVideo, 'CA-R22: perfil live recebe vídeo conteúdo');

  console.log('Smoke CAD-137 OK');
} catch (err) {
  console.error('Smoke CAD-137 FAIL:', err.message);
  process.exitCode = 1;
} finally {
  for (const ws of sockets) {
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  }
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
