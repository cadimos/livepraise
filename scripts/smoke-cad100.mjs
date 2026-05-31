#!/usr/bin/env node
/**
 * Smoke CAD-100: fundo rápido (vídeo + removeConteudo) vs abas Imagens/Vídeos (só fundo).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad100-'));

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

function collectActions(ws, durationMs = 800) {
  const actions = [];
  function onMessage(data) {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'live-action' && msg.action) {
      actions.push(msg.action.acao);
    }
  }
  ws.on('message', onMessage);
  return new Promise((resolve) => {
    setTimeout(() => {
      ws.off('message', onMessage);
      resolve(actions);
    }, durationMs);
  });
}

const QUICK_REMOVE_DELAY_MS = 200;

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;
  const dbPath = path.join(testHome, 'livepraise', 'dsw.bd');

  const seed = spawnSync(
    'sqlite3',
    [
      dbPath,
      `INSERT INTO background_rapido (id, url, diretorio, inicial) VALUES (99, 'videos/smoke/loop.mp4', 'videos', 'N');`,
    ],
    { encoding: 'utf8' },
  );
  assert(seed.status === 0, `seed background_rapido: ${seed.stderr || seed.stdout}`);

  const bgRes = await fetch(`${base}/background-rapido`).then((r) => r.json());
  assert(bgRes.status === 'Sucesso', 'GET /background-rapido');
  assert(
    bgRes.items?.some((item) => String(item.url).toLowerCase().includes('.mp4')),
    'background-rapido inclui item .mp4',
  );

  const projector = await connectClient(port, 'projector', 'Projetor');
  const operator = await connectClient(port, 'operator', 'Operador');

  const worshipHtml =
    '<div class="titulo"></div><div class="content"><span>Smoke CAD-100</span></div><div class="rodape"></div>';
  sendAction(operator, { acao: 'viewMusica', valor: worshipHtml });
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );

  sendAction(operator, {
    acao: 'background',
    valor: encodeURIComponent(`${base}/imagens/smoke.jpg`),
  });
  const tabBgActions = await collectActions(projector, 400);
  assert(tabBgActions.includes('background'), 'aba Imagens projeta background');
  assert(
    !tabBgActions.includes('removeConteudo'),
    'aba Imagens não remove conteúdo',
  );

  sendAction(operator, {
    acao: 'video',
    valor: encodeURIComponent(`${base}/videos/smoke/clip.mp4`),
  });
  const tabVideoActions = await collectActions(projector, 400);
  assert(tabVideoActions.includes('video'), 'aba Vídeos projeta video');
  assert(
    !tabVideoActions.includes('removeConteudo'),
    'aba Vídeos não remove conteúdo',
  );

  const quickVideoUrl = `${base}/videos/smoke/loop.mp4`;
  sendAction(operator, {
    acao: 'video',
    valor: encodeURIComponent(quickVideoUrl),
  });
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'video',
  );
  await new Promise((r) => setTimeout(r, QUICK_REMOVE_DELAY_MS));
  sendAction(operator, { acao: 'removeConteudo', valor: '' });
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'removeConteudo',
  );

  sendAction(operator, {
    acao: 'background',
    valor: encodeURIComponent(`${base}/imagens/quick.jpg`),
  });
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'background',
  );
  await new Promise((r) => setTimeout(r, QUICK_REMOVE_DELAY_MS));
  sendAction(operator, { acao: 'removeConteudo', valor: '' });
  await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'removeConteudo',
  );

  console.log('smoke-cad100: OK');

  projector.close();
  operator.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
