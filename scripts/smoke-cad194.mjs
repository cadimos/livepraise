#!/usr/bin/env node
/**
 * Smoke CAD-194: card adicionar na fila, upload local e import YouTube (embed fallback).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseYouTubeVideoId,
  isValidYouTubeVideoId,
  youtubeEmbedUrl,
} from '../dist/shared/youtube.js';
import { sanitizeLiveAction } from '../dist/core/projection/sanitize.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad194-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const id = parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
assert(id === 'dQw4w9WgXcQ', 'parseYouTubeVideoId');
assert(isValidYouTubeVideoId(id), 'valid id');
assert(youtubeEmbedUrl(id).includes('youtube.com/embed/'), 'embed url');
assert(youtubeEmbedUrl(id).includes('mute=0'), 'embed unmuted');
assert(
  youtubeEmbedUrl(id, { origin: 'http://127.0.0.1:3000' }).includes(
    'widget_referrer=',
  ),
  'embed widget referrer',
);

const ytAction = sanitizeLiveAction({ acao: 'youtube', valor: id });
assert(ytAction?.acao === 'youtube', 'sanitize youtube action');
assert(
  sanitizeLiveAction({ acao: 'youtube', valor: 'not-valid!!!' }) === null,
  'reject bad youtube id',
);

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

await stopLivepraiseServer();
console.log('smoke-cad194: OK');
