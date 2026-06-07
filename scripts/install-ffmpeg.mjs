#!/usr/bin/env node
/**
 * Garante o binário ffmpeg-static para a plataforma actual (paridade install-yt-dlp.mjs).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_SCRIPT = path.join(ROOT, 'node_modules', 'ffmpeg-static', 'install.js');

function ffmpegPathFromPackage() {
  try {
    return require('ffmpeg-static');
  } catch {
    return null;
  }
}

function verifyBinary() {
  const bin = ffmpegPathFromPackage();
  if (bin && fs.existsSync(bin)) return bin;
  return null;
}

async function main() {
  if (process.env.FFMPEG_SKIP_DOWNLOAD === '1') {
    console.info('install-ffmpeg: FFMPEG_SKIP_DOWNLOAD=1 — ignorado.');
    return;
  }

  const existing = verifyBinary();
  if (existing) {
    console.info(`install-ffmpeg: ${path.basename(existing)} já existe.`);
    return;
  }

  if (!fs.existsSync(INSTALL_SCRIPT)) {
    console.warn('install-ffmpeg: pacote ffmpeg-static não encontrado — ignorado.');
    return;
  }

  console.info('install-ffmpeg: a descarregar binário ffmpeg para esta plataforma…');
  const result = spawnSync(process.execPath, [INSTALL_SCRIPT], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  if (result.status !== 0) {
    throw new Error(`install-ffmpeg: install.js terminou com código ${result.status ?? 1}`);
  }

  const installed = verifyBinary();
  if (!installed) {
    throw new Error(
      'install-ffmpeg: binário não encontrado após install. Defina FFMPEG_BIN ou execute npm install novamente.',
    );
  }

  console.info(`install-ffmpeg: instalado em ${installed}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
