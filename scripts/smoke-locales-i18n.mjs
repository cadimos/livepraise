#!/usr/bin/env node
/**
 * Smoke tarefa 4 — locales adicionais (en-US) e paridade de chaves.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-locales-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

/** @param {unknown} node @param {string} [prefix] */
function flattenKeys(node, prefix = '') {
  if (Array.isArray(node)) {
    return node.flatMap((item, index) => {
      const key = `${prefix}[${index}]`;
      if (item && typeof item === 'object') return flattenKeys(item, key);
      return [key];
    });
  }
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([key, value]) => {
      const pathKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object') return flattenKeys(value, pathKey);
      return [pathKey];
    });
  }
  return [prefix];
}

const pt = JSON.parse(fs.readFileSync(path.join(appRoot, 'locales/pt-BR.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(appRoot, 'locales/en-US.json'), 'utf8'));
const installEn = JSON.parse(
  fs.readFileSync(path.join(appRoot, 'install/locales/en-US.json'), 'utf8'),
);

const ptKeys = new Set(flattenKeys(pt));
const enKeys = new Set(flattenKeys(en));
const missingInEn = [...ptKeys].filter((key) => !enKeys.has(key));
const extraInEn = [...enKeys].filter((key) => !ptKeys.has(key));

assert(missingInEn.length === 0, `chaves em falta em en-US: ${missingInEn.join(', ')}`);
assert(extraInEn.length === 0, `chaves extra em en-US: ${extraInEn.join(', ')}`);
pass('L-1', `paridade de chaves (${ptKeys.size} chaves)`);

assert(
  JSON.stringify(en) === JSON.stringify(installEn),
  'locales/en-US.json deve coincidir com install/locales/en-US.json',
);
pass('L-2', 'install/locales/en-US.json sincronizado');

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  const listRes = await fetch(`${base}/locales`);
  assert(listRes.ok, `GET /locales → ${listRes.status}`);
  const listBody = await listRes.json();
  assert(listBody.default === 'pt-BR', `default deve ser pt-BR (${listBody.default})`);
  assert(
    listBody.items?.includes('pt-BR') && listBody.items?.includes('en-US'),
    `items deve incluir pt-BR e en-US (${JSON.stringify(listBody.items)})`,
  );
  pass('L-3', 'GET /locales lista pt-BR + en-US, default pt-BR');

  const enRes = await fetch(`${base}/locales/en-US.json`);
  assert(enRes.ok, `GET /locales/en-US.json → ${enRes.status}`);
  const enBody = await enRes.json();
  assert(enBody.app?.name === 'Live Praise', 'en-US carrega mensagens');
  assert(enBody.locales?.meta?.['en-US'] === 'English', 'meta en-US');
  pass('L-4', 'GET /locales/en-US.json → 200');

  const i18nSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/i18n.ts'),
    'utf8',
  );
  assert(i18nSrc.includes("DEFAULT_LOCALE = 'pt-BR'"), 'DEFAULT_LOCALE pt-BR');
  assert(i18nSrc.includes("fallbackLocale: DEFAULT_LOCALE"), 'fallback pt-BR');

  const prefsSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/composables/usePreferences.ts'),
    'utf8',
  );
  assert(prefsSrc.includes("locale: 'pt-BR'"), 'preferência inicial pt-BR');
  pass('L-5', 'pt-BR permanece default no operador');
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-locales-i18n: OK');
