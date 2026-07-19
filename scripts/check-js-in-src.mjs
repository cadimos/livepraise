#!/usr/bin/env node
/** Falha se existir `.js` em pastas de fonte (TS-027). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_DIRS = ['apps', 'core', 'server', 'shared', 'electron', 'web'];

const violations = [];

function scanDir(absDir, relDir) {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = path.join(relDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      scanDir(abs, rel);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    violations.push(rel);
  }
}

for (const dir of SCAN_DIRS) {
  scanDir(path.join(root, dir), dir);
}

if (violations.length) {
  console.error('check:js-in-src: ficheiros .js inesperados em pastas de fonte:');
  for (const file of violations.sort()) {
    console.error(`  - ${file}`);
  }
  console.error('\nFonte deve ser .ts/.vue; scripts em scripts/ e tests/ são permitidos.');
  process.exit(1);
}

console.log('check:js-in-src: OK (nenhum .js de fonte encontrado).');
