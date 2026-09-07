#!/usr/bin/env node
/**
 * Atalhos na área de trabalho para as pastas imagens/ e videos/.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DESKTOP_MEDIA_SHORTCUTS,
  desktopShortcutFileName,
  ensureDesktopMediaShortcuts,
  resolveDesktopDir,
} from '../dist/core/desktop-media-shortcuts.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-desktop-shortcuts-'));
const desktop = path.join(tmp, 'Desktop');
fs.mkdirSync(desktop);

const livepraiseHome = path.join(tmp, 'livepraise');
const written = [];

const created = ensureDesktopMediaShortcuts({
  homedir: tmp,
  livepraiseHome,
  platform: 'linux',
  env: { LIVEPRAISE_HOME: tmp },
  writeShortcut: ({ linkPath, targetPath }) => {
    written.push({ linkPath, targetPath });
    fs.writeFileSync(linkPath, `link:${targetPath}`);
  },
});

assert(created.length === 2, `esperados 2 atalhos, obtidos ${created.length}`);
assert(
  fs.existsSync(path.join(livepraiseHome, 'imagens')),
  'pasta imagens deve ser criada',
);
assert(
  fs.existsSync(path.join(livepraiseHome, 'videos')),
  'pasta videos deve ser criada',
);
assert(
  fs.existsSync(path.join(livepraiseHome, '.desktop-media-shortcuts')),
  'marcador deve ser gravado após criar atalhos',
);

for (const item of DESKTOP_MEDIA_SHORTCUTS) {
  const file = path.join(desktop, desktopShortcutFileName(item.stem, 'linux'));
  assert(fs.existsSync(file), `atalho em falta: ${file}`);
  const target = fs.readFileSync(file, 'utf8');
  assert(
    target.includes(path.join(livepraiseHome, item.folder)),
    `atalho ${item.stem} deve apontar para ${item.folder}`,
  );
}

written.length = 0;
const second = ensureDesktopMediaShortcuts({
  homedir: tmp,
  livepraiseHome,
  platform: 'linux',
  env: { LIVEPRAISE_HOME: tmp },
  writeShortcut: ({ linkPath, targetPath }) => {
    written.push({ linkPath, targetPath });
    fs.writeFileSync(linkPath, `link:${targetPath}`);
  },
});
assert(second.length === 0, 'segunda chamada não deve recriar atalhos');
assert(written.length === 0, 'writer não deve ser chamado quando o marcador existe');

const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-desktop-none-'));
const skipped = ensureDesktopMediaShortcuts({
  homedir: isolated,
  livepraiseHome: path.join(isolated, 'livepraise'),
  platform: 'linux',
  env: { LIVEPRAISE_HOME: isolated },
  writeShortcut: () => {
    throw new Error('não deveria escrever sem pasta Desktop');
  },
});
assert(skipped.length === 0, 'sem Desktop não cria atalhos');
assert(
  !fs.existsSync(path.join(isolated, 'livepraise', '.desktop-media-shortcuts')),
  'sem Desktop não grava marcador (permite retry no próximo arranque)',
);

const resolved = resolveDesktopDir({
  homedir: tmp,
  env: { LIVEPRAISE_HOME: tmp },
  platform: 'linux',
});
assert(resolved === desktop, 'LIVEPRAISE_HOME deve usar Desktop isolado');

fs.rmSync(tmp, { recursive: true, force: true });
fs.rmSync(isolated, { recursive: true, force: true });
console.log('PASS desktop-media-shortcuts');
