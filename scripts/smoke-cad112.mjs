#!/usr/bin/env node
/**
 * Smoke CAD-112: OpenAPI na raiz cobre endpoints HTTP principais + rota de docs.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const openApiPath = path.join(appRoot, 'openapi.yaml');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const yaml = fs.readFileSync(openApiPath, 'utf8');

const requiredPaths = [
  '/health',
  '/api/docs/openapi.yaml',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/session',
  '/api/users',
  '/api/users/{id}',
  '/api/remote/chrome-tab',
  '/api/remote/live-request',
  '/api/remote/chrome-tabs',
  '/api/remote/chrome-tabs/{id}/consume',
  '/api/remote/approvals/pending',
  '/api/remote/approvals/{id}/approve',
  '/api/remote/approvals/{id}/reject',
  '/musica/categoria',
  '/musica/categoria/{codigo}',
  '/musica/verso/{codigo}',
  '/musica/{codigo}',
  '/musica',
  '/musica/verso',
  '/biblias',
  '/biblias/livros/{biblia}',
  '/biblias/capitulo/{biblia}/{livro}',
  '/biblias/versiculo/{biblia}/{livro}/{capitulo}',
  '/background-rapido',
  '/imagem/categoria',
  '/imagem/categoria/{codigo}',
  '/video/categoria',
  '/video/categoria/{codigo}',
  '/display',
  '/display/{tipo}/{largura}/{altura}',
  '/displays/config',
  '/themes',
  '/themes/{themeId}/theme.json',
  '/locales',
  '/locales/{locale}.json',
];

for (const route of requiredPaths) {
  assert(yaml.includes(`${route}:`), `openapi.yaml sem path ${route}`);
}

assert(yaml.includes('bearerAuth'), 'security scheme bearerAuth ausente');
assert(yaml.includes('x-websocket'), 'secção WebSocket documentada');
assert(yaml.includes('examples:'), 'exemplos request/response ausentes');

const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad112-'));
process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

let port;
try {
  ({ port } = await startLivepraiseServer(0));

  const specRes = await fetch(`http://127.0.0.1:${port}/api/docs/openapi.yaml`);
  assert(specRes.ok, `GET /api/docs/openapi.yaml → ${specRes.status}`);
  const specBody = await specRes.text();
  assert(specBody.includes('openapi: 3.1.0'), 'spec servida inválida');

  const uiRes = await fetch(`http://127.0.0.1:${port}/api/docs`);
  assert(uiRes.ok, `GET /api/docs → ${uiRes.status}`);
  const uiHtml = await uiRes.text();
  assert(uiHtml.includes('swagger-ui'), 'Swagger UI HTML ausente');
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-cad112: OK');
