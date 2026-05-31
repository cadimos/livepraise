#!/usr/bin/env node
/**
 * Smoke CAD-228 / QA CAD-233: import-url na fila (CA-1–CA-9).
 *
 * CA-1 / CA-2 / CA-5 (API com fixture): LIVEPRAISE_SMOKE_FIXTURE_HOST = hostname
 * público não-RFC1918 que resolva para este host (SSRF bloqueia loopback/LAN).
 * Sem env: CA-5 unitário em test:cad228; CA-1/2/5 API ficam skip documentado.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import {
  RemoteFetchError,
  assertAllowedContentType,
} from '../dist/core/security/remote-fetch.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad228-'));

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** MP4 mínimo válido (ftyp + mdat) para fixture CA-2. */
const MINI_MP4 = Buffer.from(
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAB1tZGF0AAAAMGWIhAAV//73ye/Apuvb3rkXih0YFtdo1wMAAAABbWZ0YQABAAABEwAAABTtaXllAAAAFGJ0cnQAAAAAAAAAAQAAAAEAAAAUc3R0cwAAAAAAAAABAAAAAQAAABxzdHNjAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAFGJ0cHQAAAAAAAABAQAAAAEAAAAYc3R0cwAAAAAAAAABAAAAAQAAABhzdHNjAAAAAAAAAAEAAAABAAAAHHN0c2MAAAAAAAAAAQAAAAEAAAABAAAAFGJ0cHQAAAAAAAABAQAAAAE=',
  'base64',
);

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectUnsupportedType(contentType, fileName) {
  try {
    assertAllowedContentType(contentType, fileName);
    throw new Error(`expected unsupported_type for ${contentType}`);
  } catch (err) {
    assert(
      err instanceof RemoteFetchError && err.code === 'unsupported_type',
      `CA-5 ${contentType}: ${err?.code ?? err}`,
    );
  }
}

function waitForMessage(socket, predicate, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off('message', onMessage);
      reject(new Error('Timeout WS'));
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

expectUnsupportedType('text/html', 'trap.html');
expectUnsupportedType('text/html; charset=utf-8', 'x.png');
assert(
  assertAllowedContentType('image/png', 'ok.png') === 'imagens',
  'CA-5 image/png allowed',
);

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { getVideoPipelineState } = await import(
  '../dist/server/services/videoPipeline.js'
);

async function postImportUrl(base, body) {
  const res = await fetch(`${base}/api/queue/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function startFixtureServer() {
  const server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (url.includes('/evil.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!DOCTYPE html><html><body>not media</body></html>');
      return;
    }
    if (url.includes('.mp4')) {
      res.writeHead(200, { 'Content-Type': 'video/mp4' });
      res.end(MINI_MP4);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(PNG);
  });
  await new Promise((resolve) => server.listen(0, '0.0.0.0', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  return { server, port };
}

const fixtureHost = process.env.LIVEPRAISE_SMOKE_FIXTURE_HOST?.trim() || '';
let fixture = null;

const { port } = await startLivepraiseServer();
const base = `http://127.0.0.1:${port}`;

try {
  const healthRes = await fetch(`${base}/health`);
  const health = await healthRes.json();
  assert(health.features?.cad228 === true, 'CA-9 health features.cad228');

  const openapi = fs.readFileSync(path.join(appRoot, 'openapi.yaml'), 'utf8');
  assert(openapi.includes('/api/queue/import-url'), 'CA-9 OpenAPI import-url');

  const yt = await postImportUrl(base, {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    category: 'fila',
  });
  assert(yt.status === 400, `CA-3 youtube status ${yt.status}`);
  assert(yt.json.code === 'youtube_use_dedicated_flow', 'CA-3 youtube code');

  const loopback = await postImportUrl(base, {
    url: 'http://127.0.0.1/evil.png',
    category: 'fila',
  });
  assert(loopback.status === 400, `CA-4 ssrf status ${loopback.status}`);
  assert(loopback.json.code === 'ssrf_blocked', 'CA-4 ssrf code');

  const decimal = await postImportUrl(base, {
    url: 'http://2130706433/x.png',
    category: 'fila',
  });
  assert(decimal.status === 400, `CA-4 decimal ip status ${decimal.status}`);
  assert(decimal.json.code === 'ssrf_blocked', 'CA-4 decimal ip code');

  const ref = await postImportUrl(base, {
    url: 'https://cdn.example.org/demo.png',
    category: 'fila',
    mode: 'reference',
  });
  assert(ref.status === 200, `CA-7 reference status ${ref.status}`);
  assert(ref.json.mode === 'reference', 'CA-7 reference mode');
  assert(ref.json.item?.mediaPath?.startsWith('https://'), 'CA-7 reference mediaPath');

  const uploadRes = await fetch(
    `${base}/api/queue/upload?category=fila&filename=smoke-cad228.png`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: PNG,
    },
  );
  assert(uploadRes.status === 200, `CA-8 upload status ${uploadRes.status}`);
  const uploadJson = await uploadRes.json();
  assert(uploadJson.item?.kind === 'image', 'CA-8 upload kind image');
  assert(
    uploadJson.item?.mediaPath?.includes('imagens/fila/'),
    'CA-8 upload path imagens/fila',
  );

  const ytRes = await fetch(`${base}/video/importar/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://youtu.be/dQw4w9WgXcQ',
      category: 'fila',
    }),
  });
  assert(ytRes.status === 200, `CA-8 youtube status ${ytRes.status}`);
  const ytJson = await ytRes.json();
  assert(
    ytJson.mode === 'local' || ytJson.mode === 'embed',
    'CA-8 youtube mode local or embed',
  );

  if (fixtureHost) {
    fixture = await startFixtureServer();
    const pngUrl = `http://${fixtureHost}:${fixture.port}/smoke.png`;
    const png = await postImportUrl(base, { url: pngUrl, category: 'fila' });
    assert(png.status === 200, `CA-1 fixture status ${png.status}`);
    assert(png.json.item?.kind === 'image', 'CA-1 kind image');
    assert(
      png.json.item?.mediaPath?.includes('imagens/fila/'),
      'CA-1 mediaPath',
    );
    assert(
      fs.existsSync(path.join(testHome, png.json.item.mediaPath)),
      'CA-1 file on disk',
    );

    const mp4Url = `http://${fixtureHost}:${fixture.port}/smoke.mp4`;
    const mp4 = await postImportUrl(base, { url: mp4Url, category: 'fila' });
    assert(mp4.status === 200, `CA-2 fixture status ${mp4.status}`);
    assert(mp4.json.item?.kind === 'video', 'CA-2 kind video');
    assert(
      mp4.json.item?.mediaPath?.includes('videos/fila/'),
      'CA-2 mediaPath videos/fila',
    );
    assert(mp4.json.item?.thumbPath, 'CA-2 thumbPath');
    assert(
      fs.existsSync(path.join(testHome, mp4.json.item.mediaPath)),
      'CA-2 file on disk',
    );
    const pipe = getVideoPipelineState(mp4.json.item.mediaPath);
    assert(
      pipe.status === 'processing' ||
        pipe.status === 'ready' ||
        pipe.status === 'error',
      `CA-2 pipeline state ${pipe.status}`,
    );

    const htmlUrl = `http://${fixtureHost}:${fixture.port}/evil.html`;
    const html = await postImportUrl(base, { url: htmlUrl, category: 'fila' });
    assert(html.status === 400, `CA-5 API status ${html.status}`);
    assert(html.json.code === 'unsupported_type', 'CA-5 API code');
  } else {
    console.log(
      'skip CA-1/CA-2/CA-5 API fixture (LIVEPRAISE_SMOKE_FIXTURE_HOST não definido ou LAN bloqueada por SSRF)',
    );
  }

  // CA-6: item importado (upload) → projectar background no projetor via WS
  {
    const mediaRel = uploadJson.item.mediaPath;
    const valor = encodeURIComponent(`/${mediaRel}`);
    const wsBase = `ws://127.0.0.1:${port}/ws/live`;

    const projector = new WebSocket(wsBase);
    await new Promise((resolve, reject) => {
      projector.once('open', resolve);
      projector.once('error', reject);
    });
    projector.send(
      JSON.stringify({ type: 'join', role: 'projector', name: 'smoke-cad228' }),
    );
    await waitForMessage(projector, (m) => m.type === 'joined');

    const operator = new WebSocket(wsBase);
    await new Promise((resolve, reject) => {
      operator.once('open', resolve);
      operator.once('error', reject);
    });
    operator.send(
      JSON.stringify({ type: 'join', role: 'operator', name: 'smoke-cad228-op' }),
    );
    await waitForMessage(operator, (m) => m.type === 'joined');

    const projectorLive = waitForMessage(
      projector,
      (m) =>
        m.type === 'live-action' &&
        m.action?.acao === 'background' &&
        typeof m.action?.valor === 'string' &&
        decodeURIComponent(m.action.valor).includes(mediaRel),
    );
    operator.send(
      JSON.stringify({
        type: 'live-action',
        action: { acao: 'background', valor },
      }),
    );
    await projectorLive;
    operator.close();
    projector.close();
    console.log('CA-6 WS background: OK');
  }

  // CA-8 UI: modal terceira opção + wiring (regressão CAD-194)
  {
    const modalSrc = fs.readFileSync(
      path.join(appRoot, 'apps/operator/src/components/QueueAddMediaModal.vue'),
      'utf8',
    );
    assert(modalSrc.includes("step = 'mediaUrl'"), 'CA-8 UI mediaUrl step');
    assert(modalSrc.includes('postMediaUrlImport'), 'CA-8 UI postMediaUrlImport');
    assert(modalSrc.includes('postQueueUpload'), 'CA-8 UI postQueueUpload');
    assert(modalSrc.includes('postYoutubeImport'), 'CA-8 UI postYoutubeImport');
    assert(modalSrc.includes('optionMediaUrl'), 'CA-8 UI optionMediaUrl i18n key');

    const panelSrc = fs.readFileSync(
      path.join(appRoot, 'apps/operator/src/components/ChromeTabPanel.vue'),
      'utf8',
    );
    assert(panelSrc.includes('QueueAddMediaModal'), 'CA-8 UI modal wired in panel');

    const locales = JSON.parse(
      fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'),
    );
    assert(locales.queueAdd?.optionMediaUrl, 'CA-8 i18n optionMediaUrl');
    console.log('CA-8 UI structure: OK');
  }

  const pingRes = await fetch(`${base}/video/importar/ping`);
  assert(pingRes.status === 200, 'cad194 ping still ok');

  console.log('OK — smoke CAD-228 import-url (CAD-233)');
} finally {
  await stopLivepraiseServer();
  if (fixture?.server) {
    await new Promise((resolve) => fixture.server.close(resolve));
  }
  fs.rmSync(testHome, { recursive: true, force: true });
}
