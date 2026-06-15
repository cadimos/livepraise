#!/usr/bin/env node
/**
 * SM-016–029 — aviso de deprecação; encaminha ou executa legacy.
 *
 *   node scripts/smoke-deprecated.mjs <substituto> [nota]
 *   node scripts/smoke-deprecated.mjs <substituto> --legacy <ficheiro.mjs> [nota]
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const legacyIdx = argv.indexOf('--legacy');

let substitute;
let legacyFile;
let note;

if (legacyIdx >= 0) {
  substitute = argv[0];
  legacyFile = argv[legacyIdx + 1];
  note = argv.slice(legacyIdx + 2).join(' ');
} else {
  substitute = argv[0];
  note = argv.slice(1).join(' ');
}

if (!substitute) {
  console.error('Uso: smoke-deprecated.mjs <substituto> [--legacy script.mjs] [nota]');
  process.exit(1);
}

console.warn(
  `\n⚠ DEPRECATED — preferir: npm run ${substitute}${note ? `\n   ${note}` : ''}\n`,
);

if (legacyFile) {
  const script = path.join(root, 'scripts', legacyFile);
  const result = spawnSync(process.execPath, [script], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

const result = spawnSync('npm', ['run', substitute], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
process.exit(result.status ?? 1);
