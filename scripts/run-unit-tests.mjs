#!/usr/bin/env node
/**
 * SM-041 — corre testes unitários em tests/ (subprocessos; cada ficheiro pode process.exit).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testsDir = path.join(appRoot, 'tests');

/** @returns {string[]} */
function collectTestFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectTestFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.test.mjs')) {
      out.push(full);
    }
  }
  return out.sort();
}

const files = collectTestFiles(testsDir);
if (files.length === 0) {
  console.error('run-unit-tests: nenhum *.test.mjs em tests/');
  process.exit(1);
}

for (const script of files) {
  const rel = path.relative(appRoot, script);
  const result = spawnSync(process.execPath, [script], {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`run-unit-tests FAIL: ${rel} (exit ${result.status ?? 'signal'})`);
    process.exit(result.status ?? 1);
  }
  console.log(`PASS ${rel}`);
}

console.log(`run-unit-tests: OK (${files.length} ficheiros)`);
