#!/usr/bin/env node
/**
 * Smoke tarefa 9 — versão única: package.json, /health, preload, OpenAPI, APP_VERSION.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPackageVersion } from './sync-app-version.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-version-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const pkgVersion = readPackageVersion();

const appVersionTs = fs.readFileSync(
  path.join(appRoot, 'shared', 'app-version.ts'),
  'utf8',
);
assert(
  appVersionTs.includes(`'${pkgVersion}'`),
  `shared/app-version.ts não reflecte package.json (${pkgVersion})`,
);
pass('V-1', 'APP_VERSION alinhado com package.json');

const preloadTs = fs.readFileSync(path.join(appRoot, 'electron', 'preload.ts'), 'utf8');
assert(
  preloadTs.includes(`version: '${pkgVersion}'`),
  `electron/preload.ts não reflecte package.json (${pkgVersion})`,
);
pass('V-2', 'preload.version alinhado');

const openapi = fs.readFileSync(path.join(appRoot, 'openapi.yaml'), 'utf8');
assert(
  openapi.includes(`  version: ${pkgVersion}`),
  `openapi.yaml info.version não reflecte package.json (${pkgVersion})`,
);
assert(
  openapi.includes(`                    version: ${pkgVersion}`),
  `openapi.yaml exemplo /health não reflecte package.json (${pkgVersion})`,
);
pass('V-3', 'OpenAPI alinhado');

const statusBar = fs.readFileSync(
  path.join(appRoot, 'apps/operator/src/components/StatusBar.vue'),
  'utf8',
);
assert(
  !statusBar.includes("const APP_VERSION = '"),
  'StatusBar.vue não deve ter APP_VERSION hardcoded',
);
assert(
  statusBar.includes('@shared/app-version'),
  'StatusBar.vue deve importar APP_VERSION de @shared/app-version',
);
pass('V-4', 'StatusBar usa constante partilhada');

const aboutModal = fs.readFileSync(
  path.join(appRoot, 'apps/operator/src/components/AboutModal.vue'),
  'utf8',
);
assert(
  !aboutModal.includes("const APP_VERSION = '"),
  'AboutModal.vue não deve ter APP_VERSION hardcoded',
);
assert(
  aboutModal.includes('@shared/app-version'),
  'AboutModal.vue deve importar APP_VERSION de @shared/app-version',
);
pass('V-5', 'AboutModal usa constante partilhada');

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const healthRes = await fetch(`${base}/health`);
  assert(healthRes.ok, `GET /health → ${healthRes.status}`);
  const health = await healthRes.json();
  assert(
    health.version === pkgVersion,
    `/health.version (${health.version}) ≠ package.json (${pkgVersion})`,
  );
  pass('V-6', `/health.version = ${pkgVersion}`);
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-version-sync: OK');
