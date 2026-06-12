#!/usr/bin/env node
/** Copia módulos shared compilados (dist/shared/*.js) para `shared/*.js` servidos ao browser/projetor. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromDir = path.join(root, 'dist', 'shared');
const toDir = path.join(root, 'shared');

if (!fs.existsSync(fromDir)) {
  console.error('sync-shared-modules: dist/shared não encontrado — execute build:server primeiro.');
  process.exit(1);
}

const copied = [];
for (const file of fs.readdirSync(fromDir)) {
  if (!file.endsWith('.js')) continue;
  fs.copyFileSync(path.join(fromDir, file), path.join(toDir, file));
  copied.push(file);
}

if (!copied.length) {
  console.error('sync-shared-modules: nenhum .js em dist/shared.');
  process.exit(1);
}

console.log(`sync-shared-modules: ${copied.length} ficheiro(s) actualizado(s).`);
