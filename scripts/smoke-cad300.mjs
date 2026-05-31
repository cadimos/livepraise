#!/usr/bin/env node
/**
 * Smoke CAD-300 / CAD-304 — DELETE mídia + fundos rápidos (S-1–S-5 Security).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad300-'));
const liveRoot = path.join(testHome, 'livepraise');

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const imgDir = path.join(liveRoot, 'imagens', 'slides');
const vidDir = path.join(liveRoot, 'videos', 'clips');
const thumbDir = path.join(vidDir, 'thumb');
fs.mkdirSync(imgDir, { recursive: true });
fs.mkdirSync(thumbDir, { recursive: true });

const imageRel = 'imagens/slides/fundo.jpg';
const videoRel = 'videos/clips/clip.mp4';
const thumbRel = 'videos/clips/thumb/clip.jpg';
fs.writeFileSync(path.join(liveRoot, imageRel), PNG);
fs.writeFileSync(path.join(liveRoot, videoRel), PNG);
fs.writeFileSync(path.join(liveRoot, thumbRel), PNG);

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { requireOperatorAccess } = await import('../dist/server/middleware/auth.js');
const {
  resetVideoPipelineForTests,
  setVideoPipelineStateForTests,
} = await import('../dist/server/services/videoPipeline.js');
const { getMainDb, dbRun } = await import('../dist/server/db/connection.js');
const { getLivepraiseHome } = await import('../dist/server/config/paths.js');

const LAN = '192.168.50.10';

function runOperatorMiddleware(token) {
  return new Promise((resolve) => {
    const req = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
      socket: { remoteAddress: LAN },
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json() {
        resolve(this.statusCode);
      },
    };
    requireOperatorAccess(req, res, () => resolve(200));
  });
}

async function deleteMedia(base, mount, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${mount}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, text: JSON.stringify(json) };
}

const { port } = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${port}`;

try {
  // S-1: DELETE sem auth em socket LAN → 401 (loopback local mantém bypass — paridade Electron)
  assert((await runOperatorMiddleware(null)) === 401, 'S-1 middleware sem token');
  pass('S-1', 'requireOperatorAccess LAN sem token → 401');

  // S-2: traversal → 400, disco intacto
  const traversal = await deleteMedia(base, '/imagem', {
    path: 'imagens/slides/../../musica.db',
  });
  assert(traversal.status === 400, `S-2 status ${traversal.status}`);
  assert(fs.existsSync(path.join(liveRoot, imageRel)), 'S-2 ficheiro intacto');
  assert(!traversal.text.includes(testHome), 'S-2 sem path absoluto');
  pass('S-2', 'traversal → 400, disco intacto');

  // S-3: videos path em DELETE /imagem → 400
  const wrongKind = await deleteMedia(base, '/imagem', { path: videoRel });
  assert(wrongKind.status === 400, `S-3 status ${wrongKind.status}`);
  assert(fs.existsSync(path.join(liveRoot, videoRel)), 'S-3 vídeo intacto');
  pass('S-3', 'kind errado → 400');

  // S-4: vídeo processing → 409
  resetVideoPipelineForTests();
  setVideoPipelineStateForTests(videoRel, { status: 'processing', percent: 42 });
  const processing = await deleteMedia(base, '/video', { path: videoRel });
  assert(processing.status === 409, `S-4 status ${processing.status}`);
  assert(processing.json.code === 'video_processing', 'S-4 code');
  assert(fs.existsSync(path.join(liveRoot, videoRel)), 'S-4 ficheiro intacto');
  resetVideoPipelineForTests();
  pass('S-4', 'pipeline processing → 409');

  // S-5: resposta erro não expõe home absoluto
  const home = getLivepraiseHome();
  assert(home.length > 0, 'home configurado');
  const invalid = await deleteMedia(base, '/imagem', { path: 'imagens/inexistente/x.jpg' });
  assert(invalid.status === 400, `S-5 status ${invalid.status}`);
  assert(!invalid.text.includes(home), 'S-5 sem home absoluto');
  pass('S-5', 'erro sem vazamento de home');

  // CA-5 backend: limpeza fundos rápidos após DELETE imagem
  const db = getMainDb();
  const updated = dbRun(
    db,
    "UPDATE background_rapido SET url = ?, diretorio = 'imagens', inicial = 'S' WHERE id = 1",
    [imageRel],
  );
  assert(typeof updated === 'number' && updated === 1, 'CA-5 slot preparado');
  const okImage = await deleteMedia(base, '/imagem', { path: imageRel });
  assert(okImage.status === 200, `delete imagem ${okImage.status}`);
  assert(!fs.existsSync(path.join(liveRoot, imageRel)), 'imagem apagada');
  const slots = db.prepare('SELECT url, diretorio FROM background_rapido WHERE id = 1').get();
  assert(slots.url === '' && slots.diretorio === '', 'CA-5 slot limpo');
  pass('CA-5', 'fundos rápidos limpos após DELETE imagem');

  // DELETE vídeo ready — ficheiro + thumb
  const okVideo = await deleteMedia(base, '/video', { path: videoRel });
  assert(okVideo.status === 200, `delete video ${okVideo.status}`);
  assert(!fs.existsSync(path.join(liveRoot, videoRel)), 'vídeo apagado');
  assert(!fs.existsSync(path.join(liveRoot, thumbRel)), 'thumb apagada');
  pass('CA-2', 'DELETE vídeo ready remove ficheiro + thumb');

  console.log('smoke-cad300: concluído.');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
