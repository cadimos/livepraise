#!/usr/bin/env node
/**
 * TS-038 — valida source maps só em dev, ausentes em produção.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const MAP_SAMPLE = path.join(appRoot, 'dist/apps/projector/projector.js.map');

function npmRun(script) {
  const result = spawnSync('npm', ['run', script], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} falhou`);
  }
}

console.log('verify-sourcemaps (TS-038)');

npmRun('build:browser:dev');
assert(fs.existsSync(MAP_SAMPLE), `esperado ${MAP_SAMPLE} após build:browser:dev`);
pass('TS-038-dev', 'projector.js.map presente');

npmRun('build:projector');
assert(!fs.existsSync(MAP_SAMPLE), `projector.js.map não deve existir após build:projector`);
pass('TS-038-prod', 'source maps removidos em build produção');

console.log('\nverify-sourcemaps: OK');
