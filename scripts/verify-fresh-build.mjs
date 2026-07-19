#!/usr/bin/env node
/**
 * TS-044 — valida build completo pós-clone (npm ci → build → surfaces).
 * Não substitui git clone; documenta e executa a cadeia localmente.
 */
import { assertSpawnOk, runNode, runNpm } from './lib/run-command.mjs';
import { pass, resolveAppRoot } from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);

console.log('verify-fresh-build (TS-044)');
console.log('Quickstart esperado: git clone → cd livepraise → npm ci → npm run build\n');

assertSpawnOk(
  runNode(['scripts/check-node-version.mjs'], { cwd: appRoot }),
  'check-node-version',
);
pass('check-node-version');

assertSpawnOk(runNpm(['run', 'build'], { cwd: appRoot }), 'npm run build');
pass('npm run build');

assertSpawnOk(runNpm(['run', 'smoke:surfaces'], { cwd: appRoot }), 'smoke:surfaces');
pass('smoke:surfaces');

console.log('\nverify-fresh-build: OK');
