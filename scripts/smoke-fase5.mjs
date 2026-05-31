#!/usr/bin/env node
/**
 * Smoke Fase 5: projetor + retorno palco + papéis WS (CA-R10, CA-R17, CA-R20).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-f5-'));

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

try {
  const projectorHtml = path.join(appRoot, 'apps/projector/index.html');
  const stageHtml = path.join(appRoot, 'apps/stage-return/index.html');
  assert(fs.existsSync(projectorHtml), 'apps/projector/index.html');
  assert(fs.existsSync(stageHtml), 'apps/stage-return/index.html');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/health`).then((r) => r.json());
  const displayPhases = new Set([
    'fase-5-displays',
    'fase-6-themes-i18n',
    'fase-7-network',
    'fase-8-release',
  ]);
  assert(
    displayPhases.has(health.phase),
    `health phase displays (got ${health.phase})`,
  );

  const projectorPage = await fetch(`${base}/projector/`);
  assert(projectorPage.ok, 'GET /projector/');
  const projectorBody = await projectorPage.text();
  assert(!projectorBody.includes('vue'), 'CA-R10: projetor sem SPA framework');

  const stagePage = await fetch(`${base}/stage-return/`);
  assert(stagePage.ok, 'GET /stage-return/');
  const stageBody = await stagePage.text();
  assert(stageBody.includes('stage-return.js'), 'retorno palco servido');

  const displaysApi = await fetch(`${base}/displays/config`).then((r) => r.json());
  assert(displaysApi.status === 'successo', 'API /displays/config');

  const projector = await connectClient(port, 'projector', 'Projetor');
  const stage = await connectClient(port, 'stage-return', 'Retorno');
  const operator = await connectClient(port, 'operator', 'Operador');

  const publicHtml = `<div class="content"><span>Só letra pública</span></div>`;
  const stageMusic = `<div class="retorno-musica"><section class="atual"><p class="label">Agora</p><div class="texto">Actual</div></section><section class="proximo"><p class="label">Próximo</p><div class="texto">Seguinte</div></section></div>`;

  sendAction(operator, { acao: 'viewMusica', valor: publicHtml });
  sendAction(operator, { acao: 'viewMusicaRetorno', valor: stageMusic });

  const onProjector = await waitForMessage(
    projector,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusica',
  );
  assert(
    !onProjector.action.valor.includes('Próximo'),
    'projetor não recebe layout de retorno',
  );

  const onStage = await waitForMessage(
    stage,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewMusicaRetorno',
  );
  assert(onStage.action.valor.includes('Próximo'), 'CA-R20: retorno com verso actual+próximo');

  let projectorGotRetorno = false;
  projector.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'live-action' && msg.action?.acao === 'viewMusicaRetorno') {
      projectorGotRetorno = true;
    }
  });

  sendAction(operator, {
    acao: 'viewBibliaRetorno',
    valor: '<div class="retorno-biblia"><p class="ref">Jo 3:16</p></div>',
  });

  await waitForMessage(
    stage,
    (m) => m.type === 'live-action' && m.action?.acao === 'viewBibliaRetorno',
  );
  assert(!projectorGotRetorno, 'CA-R17: retorno isolado do projetor');

  console.log('Smoke Fase 5 OK (projetor HTML, retorno palco, filtro por papel)');

  projector.close();
  stage.close();
  operator.close();
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
