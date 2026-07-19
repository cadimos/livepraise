/**
 * Helpers partilhados para smokes de release (SM-007).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Raiz do repo a partir de `import.meta.url` de um script em `scripts/`. */
export function resolveAppRoot(fromImportMetaUrl) {
  return path.resolve(path.dirname(fileURLToPath(fromImportMetaUrl)), '..');
}

/** Diretório temporário isolado para `LIVEPRAISE_HOME`. */
export function createSmokeHome(prefix = 'livepraise-smoke-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function configureSmokeEnv({ home, appRoot, port = '0' }) {
  process.env.LIVEPRAISE_HOME = home;
  process.env.LIVEPRAISE_APP_ROOT = appRoot;
  process.env.LIVEPRAISE_PORT = String(port);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function fetchJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} → ${res.status}`);
  }
  return res.json();
}

export function cleanupSmokeHome(home) {
  if (home && fs.existsSync(home)) {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

export async function loadLivepraiseServer(appRoot) {
  const entry = path.join(appRoot, 'dist/server/index.js');
  return import(pathToFileURL(entry).href);
}

export function pass(label, detail = '') {
  const suffix = detail ? `: ${detail}` : '';
  console.log(`PASS ${label}${suffix}`);
}
