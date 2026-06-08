#!/usr/bin/env node
/** Copia módulos shared compilados para `shared/*.js` (servidos ao browser/projetor). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = path.join(root, 'dist', 'shared', 'screen-layout.js');
const to = path.join(root, 'shared', 'screen-layout.js');

if (!fs.existsSync(from)) {
  console.error('sync-shared-screen-layout: dist/shared/screen-layout.js não encontrado — execute build:server primeiro.');
  process.exit(1);
}

fs.copyFileSync(from, to);
console.log('sync-shared-screen-layout: shared/screen-layout.js actualizado.');
