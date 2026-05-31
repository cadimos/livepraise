#!/usr/bin/env node
/**
 * Smoke CAD-127 (M11): path traversal bloqueado em /themes e /locales.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, '..');

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad127-'));
process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function isBlockedStatus(status) {
  return status === 400 || status === 403 || status === 404;
}

let port;
try {
  ({ port } = await startLivepraiseServer(0));
  const base = `http://127.0.0.1:${port}`;

  const okTheme = await fetch(`${base}/themes/default/theme.json`);
  assert(okTheme.ok, `GET /themes/default/theme.json → ${okTheme.status}`);

  const okLocale = await fetch(`${base}/locales/pt-BR.json`);
  assert(okLocale.ok, `GET /locales/pt-BR.json → ${okLocale.status}`);

  const themeTraversalCases = [
    '/themes/../../etc/theme.json',
    '/themes/..%2F..%2Fetc/theme.json',
    '/themes/foo..bar/theme.json',
    '/themes/foo/bar/theme.json',
  ];

  for (const route of themeTraversalCases) {
    const res = await fetch(`${base}${route}`);
    assert(
      isBlockedStatus(res.status),
      `${route} deveria ser 400/403/404, obteve ${res.status}`,
    );
  }

  const localeTraversalCases = [
    '/locales/../../etc/passwd.json',
    '/locales/..%2F..%2Fetc%2Fpasswd.json',
    '/locales/pt/BR.json',
  ];

  for (const route of localeTraversalCases) {
    const res = await fetch(`${base}${route}`);
    assert(
      isBlockedStatus(res.status),
      `${route} deveria ser 400/403/404, obteve ${res.status}`,
    );
  }

  const assetTraversal = await fetch(`${base}/themes/../../etc/assets/secret.txt`);
  assert(
    isBlockedStatus(assetTraversal.status),
    `assets com themeId inválido → ${assetTraversal.status}`,
  );
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-cad127: OK');
