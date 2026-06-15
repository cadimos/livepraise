#!/usr/bin/env node
/**
 * TS-044 — valida build completo pós-clone (npm ci → build → surfaces).
 * Não substitui git clone; documenta e executa a cadeia localmente.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pass, resolveAppRoot } from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);

function run(label, command, args) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${label} falhou (exit ${result.status ?? 'signal'})`);
  }
  pass(label);
}

console.log('verify-fresh-build (TS-044)');
console.log('Quickstart esperado: git clone → cd livepraise → npm ci → npm run build\n');

run('check-node-version', process.execPath, ['scripts/check-node-version.mjs']);
run('npm run build', 'npm', ['run', 'build']);
run('smoke:surfaces', 'npm', ['run', 'smoke:surfaces']);

console.log('\nverify-fresh-build: OK');
