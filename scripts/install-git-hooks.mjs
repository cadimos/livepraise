#!/usr/bin/env node
/**
 * TS-040 — instala hook pre-commit opt-in (lint + typecheck).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gitDir = path.join(appRoot, '.git');
const hooksDir = path.join(gitDir, 'hooks');
const source = path.join(appRoot, 'scripts', 'git-hooks', 'pre-commit');
const target = path.join(hooksDir, 'pre-commit');

if (!fs.existsSync(gitDir)) {
  console.error('install-git-hooks: .git em falta — não é um clone git?');
  process.exit(1);
}

fs.mkdirSync(hooksDir, { recursive: true });
fs.copyFileSync(source, target);
fs.chmodSync(target, 0o755);

console.log('install-git-hooks: pre-commit instalado em .git/hooks/pre-commit');
console.log('  → corre npm run lint && npm run typecheck antes de cada commit');
console.log('  → remover: rm .git/hooks/pre-commit');
