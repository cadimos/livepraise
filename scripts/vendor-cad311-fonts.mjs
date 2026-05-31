#!/usr/bin/env node
/**
 * Repõe woff2 em resources/fonts/ a partir do legado (Roboto) e @fontsource/*.
 * Uso: npm install --no-save @fontsource/roboto … && node scripts/vendor-cad311-fonts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LEGACY_COMMIT = 'd4dfda3';

const robotoLegacy = [
  ['Regular', 'Roboto-Regular'],
  ['Bold', 'Roboto-Bold'],
  ['Italic', 'Roboto-Italic'],
  ['BoldItalic', 'Roboto-BoldItalic'],
  ['Light', 'Roboto-Light'],
  ['Medium', 'Roboto-Medium'],
];

const fontsourceFamilies = [
  { pkg: 'source-sans-3', id: 'source-sans-3', prefix: 'SourceSans3' },
  { pkg: 'lato', id: 'lato', prefix: 'Lato' },
  { pkg: 'open-sans', id: 'open-sans', prefix: 'OpenSans' },
  { pkg: 'noto-sans', id: 'noto-sans', prefix: 'NotoSans' },
  { pkg: 'literata', id: 'literata', prefix: 'Literata' },
  { pkg: 'merriweather', id: 'merriweather', prefix: 'Merriweather' },
];

const weightStyle = [
  ['400', 'normal', 'Regular'],
  ['700', 'normal', 'Bold'],
  ['400', 'italic', 'Italic'],
  ['700', 'italic', 'BoldItalic'],
];

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const robotoDir = path.join(root, 'resources/fonts/roboto');
fs.mkdirSync(robotoDir, { recursive: true });
for (const [dir, base] of robotoLegacy) {
  const dest = path.join(robotoDir, `${base}.woff2`);
  const blob = execSync(`git show ${LEGACY_COMMIT}:app/fonts/${dir}/${base}.woff2`, {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 512 * 1024,
  });
  fs.writeFileSync(dest, blob);
  console.log('roboto', `${base}.woff2`);
}

for (const fam of fontsourceFamilies) {
  const filesDir = path.join(root, 'node_modules/@fontsource', fam.pkg, 'files');
  assert(fs.existsSync(filesDir), `Instale @fontsource/${fam.pkg}`);
  const all = fs.readdirSync(filesDir);
  const outDir = path.join(root, 'resources/fonts', fam.id);
  fs.mkdirSync(outDir, { recursive: true });
  for (const [w, style, suffix] of weightStyle) {
    const needle = `latin-${w}-${style}.woff2`;
    const hit = all.find((f) => f.endsWith(needle));
    assert(hit, `${fam.pkg}: ${needle} não encontrado`);
    const dest = path.join(outDir, `${fam.prefix}-${suffix}.woff2`);
    fs.copyFileSync(path.join(filesDir, hit), dest);
    console.log(fam.id, path.basename(dest));
  }
}

console.log('vendor-cad311-fonts: concluído.');
