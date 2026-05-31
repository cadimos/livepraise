#!/usr/bin/env node
/**
 * Smoke Fase 2: bootstrap + CRUD música + restart simulado (CA-04, CA-05, CA-R04).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-smoke-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
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

try {
  const dbPath = path.join(testHome, 'livepraise', 'dsw.bd');
  assert(!fs.existsSync(dbPath), 'BD não deveria existir antes do bootstrap');

  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  assert(fs.existsSync(dbPath), 'CA-05: dsw.bd criado após bootstrap');
  const bibliasDir = path.join(testHome, 'livepraise', 'biblias');
  const sqliteFiles = fs
    .readdirSync(bibliasDir)
    .filter((f) => f.endsWith('.sqlite'));
  assert(sqliteFiles.length > 0, 'CA-05: biblias copiadas de install/livepraise');

  const created = await fetchJson(`${base}/musica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Smoke Test Song',
      artista: 'Cadimos',
      compositor: 'CTO',
    }),
  });

  assert(typeof created.id === 'number', 'POST /musica deve retornar id');

  await stopLivepraiseServer();

  const { port: port2 } = await startLivepraiseServer(0);
  const base2 = `http://127.0.0.1:${port2}`;
  const fetched = await fetchJson(`${base2}/musica/${created.id}`);

  assert(
    fetched.items?.[0]?.nome === 'Smoke Test Song',
    'CA-04: música persiste após restart',
  );

  const health = await fetchJson(`${base2}/health`);
  assert(health.status === 'ok', 'health check');

  console.log('Smoke Fase 2 OK');
  await stopLivepraiseServer();
} finally {
  fs.rmSync(testHome, { recursive: true, force: true });
}
