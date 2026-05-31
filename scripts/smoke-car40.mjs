#!/usr/bin/env node
/**
 * Smoke CA-R40: conversão não-MP4 → MP4 + thumb ffmpeg (Linux headless).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-r40-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { resetVideoPipelineForTests } = await import(
  '../dist/server/services/videoPipeline.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status}`);
  }
  return res.json();
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

async function createFixtureAvi(targetPath) {
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

async function waitForReady(base, category, timeoutMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const data = await fetchJson(
      `${base}/video/categoria/${encodeURIComponent(category)}`,
    );
    const item = data.videos?.find((v) => v.video.includes('smoke-r40'));
    if (item?.pipelineStatus === 'ready' && item.thumb) return item;
    if (item?.pipelineStatus === 'error') {
      throw new Error(item.pipelineError ?? 'pipeline error');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('timeout aguardando pipeline CA-R40');
}

try {
  const home = path.join(testHome, 'livepraise');
  const category = 'smoke';
  const catDir = path.join(home, 'videos', category);
  fs.mkdirSync(catDir, { recursive: true });

  const aviPath = path.join(catDir, 'smoke-r40.avi');
  await createFixtureAvi(aviPath);
  assert(fs.existsSync(aviPath), 'fixture .avi criado');

  resetVideoPipelineForTests();
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const item = await waitForReady(base, category);
  assert(item.video.endsWith('.mp4'), 'vídeo convertido para .mp4');
  assert(item.thumb.endsWith('.jpg'), 'thumb gerada');

  const mp4Abs = path.join(home, item.video);
  const thumbAbs = path.join(home, item.thumb);
  assert(fs.existsSync(mp4Abs), 'ficheiro MP4 no disco');
  assert(fs.existsSync(thumbAbs), 'thumb no disco');
  assert(!fs.existsSync(aviPath), 'original .avi removido após conversão');

  console.log('smoke CA-R40 OK');
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
