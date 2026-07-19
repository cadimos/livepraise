#!/usr/bin/env node
/**
 * TS-038 — compila superfícies browser com source maps (só dev).
 * Produção (`npm run build`) usa tsc sem `--sourceMap`.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertSpawnOk, runNode, runNpm, runTsc } from './lib/run-command.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_FLAGS = ['--sourceMap', '--inlineSources'];

/** @param {string} script */
function npmRun(script) {
  assertSpawnOk(runNpm(['run', script], { cwd: root }), script);
}

/** @param {string} label @param {string} tsconfig @param {string} [copyApp] */
function compileBrowser(label, tsconfig, copyApp) {
  console.log(`\n=== ${label} (source maps) ===`);
  assertSpawnOk(runTsc(['-p', tsconfig, ...MAP_FLAGS], { cwd: root }), label);
  if (copyApp) {
    assertSpawnOk(
      runNode(['scripts/copy-browser-app-static.mjs', copyApp], { cwd: root }),
      `copy ${copyApp}`,
    );
  }
}

console.log('build-browser-dev (TS-038)');

npmRun('build:server');
compileBrowser('projector', 'tsconfig.projector.json', 'apps/projector');
compileBrowser('stage-return', 'tsconfig.stage-return.json', 'apps/stage-return');
compileBrowser('web/live', 'web/live/tsconfig.json', 'web/live');
compileBrowser('web/external-display', 'web/external-display/tsconfig.json', 'web/external-display');
compileBrowser('web/portal', 'web/portal/tsconfig.json', 'web/portal');
compileBrowser('web/remote', 'web/remote/tsconfig.json', 'web/remote');

console.log('\nbuild-browser-dev: OK (.js.map em dist/apps/* e dist/web/*)');
