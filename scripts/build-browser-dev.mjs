#!/usr/bin/env node
/**
 * TS-038 — compila superfícies browser com source maps (só dev).
 * Produção (`npm run build`) usa tsc sem `--sourceMap`.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAP_FLAGS = ['--sourceMap', '--inlineSources'];

/** @param {string} script */
function npmRun(script) {
  const result = spawnSync('npm', ['run', script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} falhou (exit ${result.status ?? 'signal'})`);
  }
}

/** @param {string} label @param {string} tsconfig @param {string} [copyApp] */
function compileBrowser(label, tsconfig, copyApp) {
  console.log(`\n=== ${label} (source maps) ===`);
  const result = spawnSync('npx', ['tsc', '-p', tsconfig, ...MAP_FLAGS], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} falhou (exit ${result.status ?? 'signal'})`);
  }
  if (copyApp) {
    const copy = spawnSync('node', ['scripts/copy-browser-app-static.mjs', copyApp], {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    });
    if (copy.status !== 0) {
      throw new Error(`copy ${copyApp} falhou`);
    }
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
