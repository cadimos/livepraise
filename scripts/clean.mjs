#!/usr/bin/env node
/**
 * ST-010 — remove artefactos de build para rebuild determinístico.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  'dist',
  path.join('apps', 'operator', 'node_modules', '.vite'),
];

for (const rel of targets) {
  const abs = path.join(appRoot, rel);
  if (!fs.existsSync(abs)) continue;
  fs.rmSync(abs, { recursive: true, force: true });
  console.log(`clean: removido ${rel}`);
}

console.log('clean: OK');
