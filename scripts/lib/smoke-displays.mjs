/**
 * SM-012 — footerAlert (ex cad188) + fila/media YouTube (ex cad194).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';

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

/**
 * CAD-188 — alerta marquee no rodapé via WebSocket footerAlert.
 * @param {{ pass: Function; assert: Function; appRoot: string }} ctx
 */
export async function runFooterAlertSmoke({ pass, assert, appRoot }) {
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-displays-footer-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );
  const { LIVE_ACTIONS } = await import('../../dist/shared/types/live.js');
  const {
    encodeFooterAlertState,
    parseFooterAlertState,
  } = await import('../../dist/shared/footer-alert.js');

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

    operator.close();
    projector.close();
    pass('displays-footerAlert', 'CAD-188 WS footerAlert');
  } finally {
    await stopLivepraiseServer().catch(() => {});
    fs.rmSync(testHome, { recursive: true, force: true });
  }
}

/**
 * CAD-194 — upload fila + import YouTube.
 * @param {{ pass: Function; assert: Function; appRoot: string }} ctx
 */
export async function runQueueMediaSmoke({ pass, assert, appRoot }) {
  const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-displays-queue-'));
  process.env.LIVEPRAISE_HOME = testHome;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = '0';

  const {
    parseYouTubeVideoId,
    isValidYouTubeVideoId,
    youtubeEmbedUrl,
  } = await import('../../dist/shared/youtube.js');
  const { sanitizeLiveAction } = await import('../../dist/core/projection/sanitize.js');
  const { startLivepraiseServer, stopLivepraiseServer } = await import(
    '../../dist/server/index.js'
  );

  const id = parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert(id === 'dQw4w9WgXcQ', 'parseYouTubeVideoId');
  assert(isValidYouTubeVideoId(id), 'valid id');
  assert(youtubeEmbedUrl(id).includes('youtube.com/embed/'), 'embed url');
  assert(youtubeEmbedUrl(id).includes('mute=0'), 'embed unmuted');
  assert(
    youtubeEmbedUrl(id, { origin: 'http://127.0.0.1:3000' }).includes('widget_referrer='),
    'embed widget referrer',
  );

  const ytAction = sanitizeLiveAction({ acao: 'youtube', valor: id });
  assert(ytAction?.acao === 'youtube', 'sanitize youtube action');
  assert(
    sanitizeLiveAction({ acao: 'youtube', valor: 'not-valid!!!' }) === null,
    'reject bad youtube id',
  );

  try {
    const { port } = await startLivepraiseServer();
    const base = `http://127.0.0.1:${port}`;

    const healthRes = await fetch(`${base}/health`);
    assert(healthRes.status === 200, `health status ${healthRes.status}`);
    const healthJson = await healthRes.json();
    assert(healthJson.features?.cad194 === true, 'health features.cad194');

    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    );

    const uploadRes = await fetch(
      `${base}/api/queue/upload?category=fila&filename=smoke-cad194.png`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: png,
      },
    );
    assert(uploadRes.status === 200, `upload status ${uploadRes.status}`);
    const uploadJson = await uploadRes.json();
    assert(uploadJson.item?.kind === 'image', 'upload kind image');
    assert(uploadJson.item?.mediaPath?.includes('imagens/fila/'), 'upload path');

    const pingRes = await fetch(`${base}/video/importar/ping`);
    assert(pingRes.status === 200, `ping status ${pingRes.status}`);
    const pingJson = await pingRes.json();
    assert(pingJson.cad194 === true, 'cad194 ping');

    const ytAsyncRes = await fetch(`${base}/video/importar/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        category: 'fila',
      }),
    });
    assert(ytAsyncRes.status === 200, `youtube async status ${ytAsyncRes.status}`);
    const ytAsyncJson = await ytAsyncRes.json();
    assert(ytAsyncJson.async === true, 'youtube async flag');
    assert(typeof ytAsyncJson.jobId === 'string', 'youtube jobId');
    assert(ytAsyncJson.item?.youtubeImportJobId === ytAsyncJson.jobId, 'pending queue item');

    const statusRes = await fetch(
      `${base}/video/importar/youtube/jobs/${encodeURIComponent(ytAsyncJson.jobId)}`,
    );
    assert(statusRes.status === 200, `youtube job status ${statusRes.status}`);

    const ytSyncRes = await fetch(`${base}/api/queue/youtube`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/dQw4w9WgXcQ',
        category: 'fila',
        sync: true,
      }),
    });
    assert(ytSyncRes.status === 200, `youtube sync status ${ytSyncRes.status}`);
    const ytSyncJson = await ytSyncRes.json();
    assert(ytSyncJson.async === false, 'youtube sync mode');
    assert(
      ytSyncJson.mode === 'local' || ytSyncJson.mode === 'embed',
      'youtube mode local or embed',
    );
    if (ytSyncJson.mode === 'embed') {
      assert(ytSyncJson.item?.youtubeVideoId === 'dQw4w9WgXcQ', 'embed video id');
    } else {
      assert(ytSyncJson.item?.mediaPath?.startsWith('videos/fila/'), 'local youtube path');
    }

    pass('displays-queue-media', 'CAD-194 upload + YouTube');
  } finally {
    await stopLivepraiseServer().catch(() => {});
    fs.rmSync(testHome, { recursive: true, force: true });
  }
}
