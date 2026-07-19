#!/usr/bin/env node
/** Remove `.js.map` stale após build de produção (TS-038). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const DEFAULT_DIRS = [
  'dist/apps/projector',
  'dist/apps/stage-return',
  'dist/web/live',
  'dist/web/external-display',
  'dist/web/portal',
  'dist/web/remote',
];

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_DIRS;

let removed = 0;
for (const rel of dirs) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.map')) continue;
    fs.unlinkSync(path.join(dir, name));
    removed += 1;
  }
}

if (removed > 0) {
  console.log(`strip-browser-sourcemaps: ${removed} ficheiro(s) removido(s)`);
}
