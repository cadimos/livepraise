#!/usr/bin/env node
/**
 * Propaga package.json.version → preload, OpenAPI, constante partilhada (tarefa 9).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const APP_VERSION_TS = path.join(ROOT, 'shared', 'app-version.ts');
const PRELOAD_TS = path.join(ROOT, 'electron', 'preload.ts');
const OPENAPI_YAML = path.join(ROOT, 'openapi.yaml');

/** @returns {string} */
export function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  if (typeof pkg.version !== 'string' || !pkg.version.trim()) {
    throw new Error('package.json sem campo version válido');
  }
  return pkg.version.trim();
}

/** @param {string} version */
export function syncAppVersion(version = readPackageVersion()) {
  const escaped = version.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  fs.writeFileSync(
    APP_VERSION_TS,
    [
      '/** Gerado por `scripts/sync-app-version.mjs` — não editar manualmente. */',
      `export const APP_VERSION = '${escaped}' as const;`,
      '',
    ].join('\n'),
  );

  let preload = fs.readFileSync(PRELOAD_TS, 'utf8');
  const preloadRe =
    /(exposeInMainWorld\('livepraise',\s*\{\s*\n\s*version:\s*)'[^']*'/;
  if (!preloadRe.test(preload)) {
    throw new Error('electron/preload.ts: não foi possível localizar version');
  }
  fs.writeFileSync(
    PRELOAD_TS,
    preload.replace(preloadRe, `$1'${escaped}'`),
  );

  let openapi = fs.readFileSync(OPENAPI_YAML, 'utf8');
  const infoVersionRe = /^(  version:\s*).+$/m;
  const healthExampleRe =
    /(operationId: getHealth[\s\S]*?^\s+version:\s*).+$/m;
  if (!infoVersionRe.test(openapi) || !healthExampleRe.test(openapi)) {
    throw new Error('openapi.yaml: não foi possível localizar version');
  }
  openapi = openapi.replace(infoVersionRe, `$1${version}`);
  openapi = openapi.replace(healthExampleRe, `$1${version}`);
  fs.writeFileSync(OPENAPI_YAML, openapi);

  return version;
}

function main() {
  const version = syncAppVersion();
  console.log(`sync-app-version: ${version}`);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
