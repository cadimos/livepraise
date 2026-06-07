#!/usr/bin/env node
/**
 * Instala o binário do Electron para a plataforma actual (dev e CI).
 * O install.js embutido em electron@42 usa require('@electron/get'), mas @electron/get@5 é ESM-only.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const electronDir = path.join(root, 'node_modules', 'electron');

if (!fs.existsSync(path.join(electronDir, 'package.json'))) {
  console.warn('install-electron: pacote electron não encontrado; ignorando.');
  process.exit(0);
}

main().catch((err) => {
  console.error('install-electron:', err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) console.error(err.stack);
  process.exit(1);
});

async function main() {
  const { version } = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
  const extract = require('extract-zip');
  const { downloadArtifact } = await import('@electron/get');

  const platformPath = getPlatformPath();

  if (isInstalled(version, platformPath)) {
    console.log('install-electron: binário já presente para esta plataforma.');
    return;
  }

  const platform =
    process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || process.platform;
  let arch = process.env.ELECTRON_INSTALL_ARCH || process.env.npm_config_arch || process.arch;

  if (
    platform === 'darwin' &&
    process.platform === 'darwin' &&
    arch === 'x64' &&
    process.env.npm_config_arch === undefined
  ) {
    try {
      const output = execSync('sysctl -in sysctl.proc_translated', { encoding: 'utf8' });
      if (output.trim() === '1') arch = 'arm64';
    } catch {
      // ignore
    }
  }

  const distDir = path.join(electronDir, 'dist');
  if (hasStaleDist(distDir, platformPath)) {
    console.log('install-electron: a limpar dist de outra plataforma…');
    fs.rmSync(distDir, { recursive: true, force: true });
  }

  console.log(`install-electron: a descarregar Electron ${version} (${platform}/${arch})…`);

  const checksums = JSON.parse(
    fs.readFileSync(path.join(electronDir, 'checksums.json'), 'utf8'),
  );

  const zipPath = await downloadArtifact({
    version,
    artifactName: 'electron',
    force: process.env.force_no_cache === 'true',
    cacheRoot: process.env.electron_config_cache,
    checksums:
      process.env.electron_use_remote_checksums ||
      process.env.npm_config_electron_use_remote_checksums
        ? undefined
        : checksums,
    platform,
    arch,
  });

  await extract(zipPath, { dir: distDir });

  const distPath = process.env.ELECTRON_OVERRIDE_DIST_PATH || distDir;
  const srcTypeDefPath = path.join(distPath, 'electron.d.ts');
  const targetTypeDefPath = path.join(electronDir, 'electron.d.ts');
  if (fs.existsSync(srcTypeDefPath)) {
    fs.renameSync(srcTypeDefPath, targetTypeDefPath);
  }

  await fs.promises.writeFile(path.join(electronDir, 'path.txt'), platformPath);
  console.log('install-electron: concluído.');
}

function getPlatformPath() {
  const p =
    process.env.ELECTRON_INSTALL_PLATFORM || process.env.npm_config_platform || os.platform();
  switch (p) {
    case 'mas':
    case 'darwin':
      return 'Electron.app/Contents/MacOS/Electron';
    case 'freebsd':
    case 'openbsd':
    case 'linux':
      return 'electron';
    case 'win32':
      return 'electron.exe';
    default:
      throw new Error(`Electron builds are not available on platform: ${p}`);
  }
}

function isInstalled(version, platformPath) {
  try {
    const installedVersion = fs
      .readFileSync(path.join(electronDir, 'dist', 'version'), 'utf8')
      .replace(/^v/, '');
    if (installedVersion !== version) return false;

    const pathTxt = fs.readFileSync(path.join(electronDir, 'path.txt'), 'utf8');
    if (pathTxt.trim() !== platformPath) return false;
  } catch {
    return false;
  }

  const electronPath =
    process.env.ELECTRON_OVERRIDE_DIST_PATH ||
    path.join(electronDir, 'dist', platformPath);
  return fs.existsSync(electronPath);
}

function hasStaleDist(distDir, platformPath) {
  if (!fs.existsSync(distDir)) return false;
  const electronPath = path.join(distDir, platformPath);
  if (fs.existsSync(electronPath)) return false;
  try {
    return fs.readdirSync(distDir).length > 0;
  } catch {
    return false;
  }
}
