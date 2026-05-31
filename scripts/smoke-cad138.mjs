#!/usr/bin/env node
/**
 * Smoke CAD-138: barra de status — dispositivos externos (CA-R32–34).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad138-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';
process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD = 'smoke-cad138-pass';

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
      showChords: profile === 'stage' || profile === 'player',
    }),
  );
  await waitForMessage(ws, (m) => m.type === 'joined');
  return ws;
}

function countPresence(onlineDevices) {
  const devices = [...onlineDevices.values()];
  return {
    projection: devices.filter((d) => d.profile === 'live' || d.profile === 'vocal')
      .length,
    returnCount: devices.filter((d) => d.profile === 'stage' || d.profile === 'player')
      .length,
    stageReturn: devices.filter((d) => d.profile === 'stage').length,
  };
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const operatorWs = new WebSocket(`ws://127.0.0.1:${port}/ws/live`);
  await new Promise((r) => operatorWs.once('open', r));
  operatorWs.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Op' }));
  await waitForMessage(operatorWs, (m) => m.type === 'joined');

  const onlineDevices = new Map();
  operatorWs.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type !== 'device-presence') return;
    if (msg.event === 'online') {
      onlineDevices.set(msg.device.deviceId, msg.device);
    } else {
      onlineDevices.delete(msg.device.deviceId);
    }
  });

  const profiles = ['live', 'vocal', 'stage', 'player'];
  const sockets = [];
  for (const profile of profiles) {
    const deviceId = randomUUID();
    await fetch(`${base}/api/devices/${deviceId}?profile=${profile}`);
    const presencePromise = waitForMessage(
      operatorWs,
      (m) =>
        m.type === 'device-presence' &&
        m.event === 'online' &&
        m.device?.profile === profile,
    );
    sockets.push(await joinExternal(port, profile, deviceId));
    await presencePromise;
  }

  await new Promise((r) => setTimeout(r, 150));
  const counts = countPresence(onlineDevices);
  assert(counts.projection === 2, 'CA-R32: live+vocal incrementam em projeção');
  assert(counts.returnCount === 2, 'CA-R32: stage+player incrementam em retorno');
  assert(counts.stageReturn === 1, 'CA-R33: /stage incrementa retorno palco');

  const stageDevice = [...onlineDevices.values()].find((d) => d.profile === 'stage');
  assert(stageDevice, 'dispositivo stage online');

  const patch = await fetch(`${base}/api/devices/${stageDevice.deviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: 'TV Palco', showChords: true }),
  });
  assert(patch.ok, 'CA-R34: PATCH configuração dispositivo externo');

  const saved = await fetch(`${base}/api/devices/${stageDevice.deviceId}`);
  const savedBody = await saved.json();
  assert(savedBody.device.label === 'TV Palco', 'label persistida');
  assert(savedBody.device.showChords === true, 'showChords persistido');

  const operatorHtmlPath = path.join(appRoot, 'dist/apps/operator/index.html');
  assert(fs.existsSync(operatorHtmlPath), 'operator build presente');
  const operatorAssetsDir = path.join(appRoot, 'dist/apps/operator/assets');
  const assetFiles = fs.readdirSync(operatorAssetsDir);
  const hasStatusPanelMarker = assetFiles.some((file) => {
    const content = fs.readFileSync(path.join(operatorAssetsDir, file), 'utf8');
    return (
      content.includes('status-displays-trigger') ||
      content.includes('status-external-devices-panel')
    );
  });
  assert(hasStatusPanelMarker, 'CA-R34: UI barra de status expõe painel de dispositivos');

  for (const ws of sockets) ws.close();
  operatorWs.close();

  console.log('Smoke CAD-138 OK');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
