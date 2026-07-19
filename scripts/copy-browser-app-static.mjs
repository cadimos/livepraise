#!/usr/bin/env node
/** Copia index.html e *.css para dist/<caminho>/ após tsc (apps/* ou web/*). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const relPath = process.argv[2];
if (!relPath) {
  console.error('Uso: node scripts/copy-browser-app-static.mjs <apps/projector|web/live|…>');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, relPath);
const destDir = path.join(root, 'dist', relPath);

if (!fs.existsSync(srcDir)) {
  console.error(`copy-browser-app-static: ${relPath} não encontrado.`);
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const file of fs.readdirSync(srcDir)) {
  if (!file.endsWith('.html') && !file.endsWith('.css')) continue;
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  copied += 1;
}

console.log(`copy-browser-app-static: ${copied} ficheiro(s) → dist/${relPath}/`);
