#!/usr/bin/env node
/**
 * Smoke tarefa 4 — locales adicionais e paridade de chaves.
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

const DERIVED_LOCALES = ['en-US', 'pt-PT', 'es-ES'];

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
const ptKeys = new Set(flattenKeys(pt));
pass('L-0', `fonte pt-BR (${ptKeys.size} chaves)`);

for (const code of DERIVED_LOCALES) {
  const locale = JSON.parse(
    fs.readFileSync(path.join(appRoot, `locales/${code}.json`), 'utf8'),
  );
  const install = JSON.parse(
    fs.readFileSync(path.join(appRoot, `install/locales/${code}.json`), 'utf8'),
  );
  const localeKeys = new Set(flattenKeys(locale));
  const missing = [...ptKeys].filter((key) => !localeKeys.has(key));
  const extra = [...localeKeys].filter((key) => !ptKeys.has(key));
  assert(missing.length === 0, `${code}: chaves em falta: ${missing.join(', ')}`);
  assert(extra.length === 0, `${code}: chaves extra: ${extra.join(', ')}`);
  assert(
    JSON.stringify(locale) === JSON.stringify(install),
    `locales/${code}.json deve coincidir com install/locales/${code}.json`,
  );
  pass(`L-${code}`, `paridade de chaves`);
}

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
  for (const code of ['pt-BR', ...DERIVED_LOCALES]) {
    assert(
      listBody.items?.includes(code),
      `items deve incluir ${code} (${JSON.stringify(listBody.items)})`,
    );
  }
  pass('L-api-list', 'GET /locales lista todos os idiomas, default pt-BR');

  for (const code of DERIVED_LOCALES) {
    const res = await fetch(`${base}/locales/${code}.json`);
    assert(res.ok, `GET /locales/${code}.json → ${res.status}`);
    const body = await res.json();
    assert(body.app?.name === 'Live Praise', `${code} carrega mensagens`);
    assert(body.locales?.meta?.[code], `${code} meta legível`);
    pass(`L-api-${code}`, `GET /locales/${code}.json → 200`);
  }

  const i18nSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/i18n.ts'),
    'utf8',
  );
  assert(i18nSrc.includes("DEFAULT_LOCALE = 'pt-BR'"), 'DEFAULT_LOCALE pt-BR');
  assert(i18nSrc.includes('fallbackLocale: DEFAULT_LOCALE'), 'fallback pt-BR');

  const prefsSrc = fs.readFileSync(
    path.join(appRoot, 'apps/operator/src/composables/usePreferences.ts'),
    'utf8',
  );
  assert(prefsSrc.includes("locale: 'pt-BR'"), 'preferência inicial pt-BR');
  pass('L-default', 'pt-BR permanece default no operador');
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-locales-i18n: OK');
