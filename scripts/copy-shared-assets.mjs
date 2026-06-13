#!/usr/bin/env node
/** Copia CSS de shared/ para dist/shared/ (servido com os módulos JS compilados). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromDir = path.join(root, 'shared');
const toDir = path.join(root, 'dist', 'shared');

if (!fs.existsSync(toDir)) {
  console.error('copy-shared-assets: dist/shared não encontrado — execute tsc primeiro.');
  process.exit(1);
}

let copied = 0;
for (const file of fs.readdirSync(fromDir)) {
  if (!file.endsWith('.css')) continue;
  fs.copyFileSync(path.join(fromDir, file), path.join(toDir, file));
  copied += 1;
}

console.log(`copy-shared-assets: ${copied} ficheiro(s) CSS copiado(s).`);
