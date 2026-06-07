#!/usr/bin/env node
/**
 * Smoke tarefa 5 — watcher de vídeos + evento media-updated.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';
import ffmpegPath from 'ffmpeg-static';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-vidwatch-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}`));
    });
  });
}

async function createFixtureMp4(targetPath) {
  await runFfmpeg([
    '-y',
    '-f',
    'lavfi',
    '-i',
    'testsrc=duration=1:size=320x240:rate=10',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    targetPath,
  ]);
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
  return res.json();
}

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { handleVideoWatcherPathForTests } = await import(
  '../dist/server/services/videoWatcher.js'
);

const livepraiseDir = path.join(testHome, 'livepraise');
const category = 'smoke-watch';
const categoryDir = path.join(livepraiseDir, 'videos', category);
fs.mkdirSync(categoryDir, { recursive: true });

const server = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${server.port}`;
const wsUrl = `ws://127.0.0.1:${server.port}/ws/live`;

let mediaUpdated = null;
const ws = new WebSocket(wsUrl);

try {
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.send(JSON.stringify({ type: 'join', role: 'operator', name: 'Smoke' }));

  await new Promise((resolve) => {
    ws.on('message', (raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.type === 'joined') resolve();
    });
  });

  ws.on('message', (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === 'media-updated') mediaUpdated = msg;
  });

  const before = await fetchJson(
    `${base}/video/categoria/${encodeURIComponent(category)}`,
  );
  assert((before.videos ?? []).length === 0, 'categoria deve começar vazia');
  pass('VW-1', 'lista inicial vazia');

  const mp4Name = 'watcher-smoke.mp4';
  const mp4Path = path.join(categoryDir, mp4Name);
  await createFixtureMp4(mp4Path);

  handleVideoWatcherPathForTests(`videos/${category}/${mp4Name}`);
  await new Promise((r) => setTimeout(r, 700));

  const after = await fetchJson(
    `${base}/video/categoria/${encodeURIComponent(category)}`,
  );
  const item = (after.videos ?? []).find((v) => v.video.includes('watcher-smoke'));
  assert(item, 'tile visível após copiar mp4 sem relistar manualmente');
  pass('VW-2', `vídeo listado (${item.video})`);

  assert(mediaUpdated?.kind === 'videos', 'WS media-updated.kind');
  assert(mediaUpdated?.category === category, 'WS media-updated.category');
  assert(String(mediaUpdated?.path ?? '').includes('watcher-smoke'), 'WS media-updated.path');
  pass('VW-3', 'evento media-updated recebido');

  const ignoredPath = path.join(categoryDir, 'ignored.part');
  fs.writeFileSync(ignoredPath, 'partial');
  handleVideoWatcherPathForTests(`videos/${category}/ignored.part`);
  await new Promise((r) => setTimeout(r, 700));
  const afterPart = await fetchJson(
    `${base}/video/categoria/${encodeURIComponent(category)}`,
  );
  assert(
    !(afterPart.videos ?? []).some((v) => v.video.includes('ignored.part')),
    'ficheiros .part devem ser ignorados',
  );
  pass('VW-4', 'ignora .part');
} finally {
  ws.close();
  await stopLivepraiseServer();
}

console.log('smoke-video-watcher: OK');
