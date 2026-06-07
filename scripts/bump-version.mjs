#!/usr/bin/env node
/**
 * Actualiza package.json (e lock) e propaga a versão para todos os consumidores.
 *
 * Uso: npm run bump-version -- 1.0.0-alpha.3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncAppVersion } from './sync-app-version.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');

const VERSION_RE = /^\d+\.\d+\.\d+(-[a-zA-Z][a-zA-Z0-9.-]*)?$/;

/** @param {string} version */
function writePackageVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

  if (fs.existsSync(LOCK_PATH)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
  }
}

function main() {
  const nextVersion = process.argv[2]?.trim();
  if (!nextVersion) {
    console.error('Uso: npm run bump-version -- <versão>');
    console.error('Ex.: npm run bump-version -- 1.0.0-alpha.3');
    process.exit(1);
  }
  if (!VERSION_RE.test(nextVersion)) {
    console.error(`Versão inválida: "${nextVersion}"`);
    process.exit(1);
  }

  writePackageVersion(nextVersion);
  syncAppVersion(nextVersion);
  console.log(`bump-version: ${nextVersion}`);
}

main();
