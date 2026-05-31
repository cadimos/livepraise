#!/usr/bin/env node
/**
 * Descarrega o binário yt-dlp para vendor/yt-dlp/ (por plataforma).
 * Equivalente ao ffmpeg-static — não depende de instalação no sistema do cliente.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VENDOR_DIR = path.join(ROOT, 'vendor', 'yt-dlp');

function assetForPlatform(platform, arch) {
  if (platform === 'win32') {
    if (arch === 'arm64') return 'yt-dlp_arm64.exe';
    if (arch === 'ia32') return 'yt-dlp_x86.exe';
    return 'yt-dlp.exe';
  }
  if (platform === 'darwin') return 'yt-dlp_macos';
  if (platform === 'linux') {
    if (arch === 'arm64') return 'yt-dlp_linux_aarch64';
    return 'yt-dlp_linux';
  }
  return null;
}

function localExecutableName() {
  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

async function main() {
  if (process.env.YTDLP_SKIP_DOWNLOAD === '1') {
    console.info('install-yt-dlp: YTDLP_SKIP_DOWNLOAD=1 — ignorado.');
    return;
  }

  const platform = process.env.npm_config_platform || os.platform();
  const arch = process.env.npm_config_arch || os.arch();
  const asset = assetForPlatform(platform, arch);
  if (!asset) {
    console.warn(`install-yt-dlp: plataforma não suportada (${platform}/${arch}).`);
    return;
  }

  const dest = path.join(VENDOR_DIR, localExecutableName());
  if (fs.existsSync(dest)) {
    console.info(`install-yt-dlp: ${path.basename(dest)} já existe.`);
    return;
  }

  const baseUrl =
    process.env.YTDLP_BINARIES_URL?.replace(/\/$/, '') ??
    'https://github.com/yt-dlp/yt-dlp/releases/latest/download';
  const url = `${baseUrl}/${asset}`;

  fs.mkdirSync(VENDOR_DIR, { recursive: true });
  console.info(`install-yt-dlp: a descarregar ${asset}…`);

  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`install-yt-dlp: HTTP ${res.status} ao descarregar ${url}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  if (platform !== 'win32') {
    fs.chmodSync(dest, 0o755);
  }

  console.info(`install-yt-dlp: instalado em ${dest}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
