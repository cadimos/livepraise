#!/usr/bin/env node
/**
 * TS-038 — valida source maps só em dev, ausentes em produção.
 */
import fs from 'node:fs';
import path from 'node:path';

import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';
import { assertSpawnOk, runNpm } from './lib/run-command.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const MAP_SAMPLE = path.join(appRoot, 'dist/apps/projector/projector.js.map');

function npmRun(script) {
  assertSpawnOk(runNpm(['run', script], { cwd: appRoot }), script);
}

console.log('verify-sourcemaps (TS-038)');

npmRun('build:browser:dev');
assert(fs.existsSync(MAP_SAMPLE), `esperado ${MAP_SAMPLE} após build:browser:dev`);
pass('TS-038-dev', 'projector.js.map presente');

npmRun('build:projector');
assert(!fs.existsSync(MAP_SAMPLE), `projector.js.map não deve existir após build:projector`);
pass('TS-038-prod', 'source maps removidos em build produção');

console.log('\nverify-sourcemaps: OK');
