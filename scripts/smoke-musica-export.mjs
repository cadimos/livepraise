#!/usr/bin/env node
/**
 * Smoke tarefa 11 — export/import granular de repertório (louvores).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const exportHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-mus-export-'));
const importHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-mus-import-'));

process.env.LIVEPRAISE_HOME = exportHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { countRepertoireVerses } = await import('../dist/shared/music-repertoire.js');
const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url, init) {
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status}: ${body.message ?? ''}`);
  }
  return body;
}

async function countVersesInDb(base, songId) {
  const data = await fetchJson(`${base}/musica/verso/${songId}`);
  return (data.items ?? []).length;
}

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const created = await fetchJson(`${base}/musica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cat: '1',
      nome: 'Export Smoke Song',
      artista: 'Cadimos',
      compositor: 'CTO',
    }),
  });
  assert(typeof created.id === 'number', 'POST /musica deve retornar id');

  const verses = ['Primeiro verso', 'Segundo verso', 'Terceiro verso'];
  for (const verso of verses) {
    await fetchJson(`${base}/musica/verso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musica: String(created.id), verso }),
    });
  }

  const exported = await fetchJson(`${base}/musica/export?songIds=${created.id}`);
  assert(exported.file?.format === 'livepraise-music-repertoire', 'formato de exportação');
  const exportVerseCount = countRepertoireVerses(exported.file);
  assert(exportVerseCount === verses.length, 'export deve conter todos os versos');

  await stopLivepraiseServer();

  process.env.LIVEPRAISE_HOME = importHome;
  const { port: port2 } = await startLivepraiseServer(0);
  const base2 = `http://127.0.0.1:${port2}`;

  const imported = await fetchJson(`${base2}/musica/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exported.file),
  });
  assert(imported.result?.versesImported === verses.length, 'import deve trazer todos os versos');

  const catData = await fetchJson(`${base2}/musica/categoria/1`);
  const hit = (catData.items ?? []).find((s) => s.nome === 'Export Smoke Song');
  assert(hit, 'música importada deve existir na categoria');
  const dbVerseCount = await countVersesInDb(base2, hit.id);
  assert(dbVerseCount === verses.length, 'BD limpa deve ter a mesma contagem de versos');

  const { MUSIC_REPERTOIRE_MAX_BYTES } = await import('../dist/shared/music-repertoire.js');
  const oversized = `{${' '.repeat(MUSIC_REPERTOIRE_MAX_BYTES + 64)}}`;
  const res = await fetch(`${base2}/musica/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: oversized,
  });
  assert(res.status === 400, 'import deve rejeitar ficheiro acima do limite de tamanho');

  console.log('Smoke musica-export OK');
  await stopLivepraiseServer();
} finally {
  fs.rmSync(exportHome, { recursive: true, force: true });
  fs.rmSync(importHome, { recursive: true, force: true });
}
