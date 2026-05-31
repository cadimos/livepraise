#!/usr/bin/env node
/**
 * Smoke CAD-311 — fontes embutidas GET /fonts + GET /api/system/fonts (S-1–S-7).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad311-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { getLivepraiseHome } = await import('../dist/server/config/paths.js');
const { requireOperatorAccess } = await import('../dist/server/middleware/auth.js');

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

const { port } = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${port}`;
const home = getLivepraiseHome();

try {
  // S-1: traversal no segmento fileName
  const s1 = await fetch(`${base}/fonts/roboto/..%2F..%2Fmusica.db`);
  assert(s1.status === 404, `S-1 status ${s1.status}`);
  const s1text = await s1.text();
  assert(!s1text.includes(testHome), 'S-1 sem home no body');
  pass('S-1', 'traversal → 404');

  // S-2: ficheiro fora do manifesto
  const rogueDir = path.join(home, 'fonts', 'roboto');
  const rogueFile = path.join(rogueDir, 'rogue.woff2');
  fs.mkdirSync(rogueDir, { recursive: true });
  fs.writeFileSync(rogueFile, Buffer.alloc(8));
  const s2 = await fetch(`${base}/fonts/roboto/rogue.woff2`);
  assert(s2.status === 404, `S-2 status ${s2.status}`);
  pass('S-2', 'fora do manifesto → 404');

  // S-3: familia inválida
  const s3 = await fetch(`${base}/fonts/../Roboto-Regular.woff2`);
  assert(s3.status === 404, `S-3a status ${s3.status}`);
  const s3b = await fetch(`${base}/fonts/foo%2Fbar/file.woff2`);
  assert(s3b.status === 404, `S-3b status ${s3b.status}`);
  pass('S-3', 'familia inválida → 404');

  // S-4: extensão inválida
  const s4 = await fetch(`${base}/fonts/roboto/secret.exe`);
  assert(s4.status === 404, `S-4 status ${s4.status}`);
  const s4b = await fetch(`${base}/fonts/roboto/manifest.json`);
  assert(s4b.status === 404, `S-4b status ${s4b.status}`);
  pass('S-4', 'extensão inválida → 404');

  // S-5: fonte válida
  const s5 = await fetch(`${base}/fonts/roboto/Roboto-Regular.woff2`);
  assert(s5.status === 200, `S-5 status ${s5.status}`);
  assert(s5.headers.get('content-type') === 'font/woff2', `S-5 type ${s5.headers.get('content-type')}`);
  const buf = await s5.arrayBuffer();
  assert(buf.byteLength > 1000, 'S-5 corpo');
  pass('S-5', 'Roboto-Regular.woff2 → 200 font/woff2');

  // S-6: system fonts sem auth em socket LAN (HTTP local usa loopback — paridade cad300)
  assert((await runOperatorMiddleware(null)) === 401, 'S-6 middleware LAN sem token');
  pass('S-6', 'requireOperatorAccess LAN sem token → 401');

  // S-7: erro não expõe home
  const s7 = await fetch(`${base}/fonts/roboto/inexistente.woff2`);
  assert(s7.status === 404, `S-7 status ${s7.status}`);
  const s7text = await s7.text();
  assert(!s7text.includes(home), 'S-7 sem home absoluto');
  pass('S-7', '404 sem vazamento de home');

  // loopback: system fonts acessível (paridade Electron)
  const s6ok = await fetch(`${base}/api/system/fonts`);
  assert(s6ok.status === 200, `loopback system fonts ${s6ok.status}`);
  const payload = await s6ok.json();
  assert(payload.status === 'successo', 'status successo');
  assert(Array.isArray(payload.items), 'items array');
  const sample = payload.items[0];
  if (sample) {
    assert(typeof sample.family === 'string', 'family string');
    assert(!('path' in sample) && !('file' in sample), 'sem paths SO');
  }
  pass('CA-api', 'GET /api/system/fonts loopback → 200 payload mínimo');

  console.log('smoke-cad311: concluído.');
} finally {
  await stopLivepraiseServer();
  fs.rmSync(testHome, { recursive: true, force: true });
}
