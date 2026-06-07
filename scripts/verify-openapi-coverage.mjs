#!/usr/bin/env node
/**
 * Verifica que cada endpoint JSON do servidor Express está documentado em openapi.yaml.
 * Não cobre rotas estáticas (SPA, /imagens, /videos) nem WebSocket (documentado em x-websocket).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const specPath = path.join(root, 'openapi.yaml');
const specText = fs.readFileSync(specPath, 'utf8');

function parseOpenApiPaths(text) {
  const paths = {};
  let current = null;
  for (const line of text.split('\n')) {
    const pathMatch = line.match(/^  (\/\S+):$/);
    if (pathMatch) {
      current = pathMatch[1];
      paths[current] = paths[current] ?? {};
      continue;
    }
    if (!current) continue;
    const methodMatch = line.match(/^    (get|post|put|patch|delete):$/);
    if (methodMatch) {
      paths[current][methodMatch[1].toUpperCase()] = true;
    }
  }
  return paths;
}

const specPaths = parseOpenApiPaths(specText);
const hasWebSocket = /x-websocket:\s*\n\s*\/ws\/live:/m.test(specText);

/** method + OpenAPI path template */
const IMPLEMENTED = [
  ['GET', '/health'],
  ['GET', '/fonts/{familia}/{fileName}'],
  ['GET', '/api/system/fonts'],
  ['GET', '/api/system/local-ip'],
  ['GET', '/api/docs/openapi.yaml'],
  ['GET', '/api/docs'],
  ['POST', '/api/auth/login'],
  ['POST', '/api/auth/logout'],
  ['GET', '/api/auth/me'],
  ['GET', '/api/auth/session'],
  ['GET', '/api/users'],
  ['POST', '/api/users'],
  ['PATCH', '/api/users/{id}'],
  ['GET', '/api/audit/logs'],
  ['POST', '/api/remote/chrome-tab'],
  ['POST', '/api/remote/live-request'],
  ['GET', '/api/remote/chrome-tabs'],
  ['POST', '/api/remote/chrome-tabs/{id}/consume'],
  ['GET', '/api/remote/approvals/pending'],
  ['POST', '/api/remote/approvals/{id}/approve'],
  ['POST', '/api/remote/approvals/{id}/reject'],
  ['GET', '/api/devices'],
  ['GET', '/api/devices/{deviceId}'],
  ['PATCH', '/api/devices/{deviceId}'],
  ['GET', '/musica/categoria'],
  ['GET', '/musica/categoria/{codigo}'],
  ['GET', '/musica/export'],
  ['POST', '/musica/import'],
  ['GET', '/musica/verso/{codigo}'],
  ['GET', '/musica/{codigo}'],
  ['POST', '/musica/{codigo}'],
  ['DELETE', '/musica/{codigo}'],
  ['POST', '/musica'],
  ['POST', '/musica/verso'],
  ['POST', '/playlist/resolve'],
  ['GET', '/biblias'],
  ['GET', '/biblias/livros/{biblia}'],
  ['GET', '/biblias/capitulo/{biblia}/{livro}'],
  ['GET', '/biblias/versiculo/{biblia}/{livro}/{capitulo}'],
  ['GET', '/background-rapido'],
  ['PATCH', '/background-rapido/{id}'],
  ['GET', '/imagem/propriedades'],
  ['GET', '/imagem/categoria'],
  ['PATCH', '/imagem/categoria'],
  ['DELETE', '/imagem'],
  ['GET', '/imagem/categoria/{codigo}'],
  ['GET', '/video/propriedades'],
  ['GET', '/video/categoria'],
  ['PATCH', '/video/categoria'],
  ['DELETE', '/video'],
  ['GET', '/video/categoria/{codigo}'],
  ['GET', '/display'],
  ['GET', '/display/{tipo}/{largura}/{altura}'],
  ['GET', '/displays/config'],
  ['PUT', '/displays/config'],
  ['GET', '/themes'],
  ['GET', '/themes/{themeId}/theme.json'],
  ['GET', '/themes/{themeId}/variables.css'],
  ['GET', '/themes/{themeId}/assets/{filename}'],
  ['GET', '/locales'],
  ['GET', '/locales/{locale}.json'],
  ['GET', '/api/system/error-log'],
  ['POST', '/api/system/error-log'],
  ['DELETE', '/api/system/error-log'],
  ['POST', '/api/queue/import-url'],
  ['POST', '/video/importar/url'],
  ['POST', '/imagem/importar/url'],
];

function documented(method, route) {
  return Boolean(specPaths[route]?.[method]);
}

const missing = IMPLEMENTED.filter(([m, r]) => !documented(m, r));
const extra = Object.entries(specPaths).flatMap(([route, ops]) =>
  Object.keys(ops).filter(
    (k) => !IMPLEMENTED.some(([m, r]) => m === k && r === route),
  ).map((k) => `${k} ${route}`),
);

if (missing.length) {
  console.error('openapi.yaml — endpoints em falta:\n', missing.map((x) => `  ${x[0]} ${x[1]}`).join('\n'));
  process.exit(1);
}

if (extra.length) {
  console.warn('openapi.yaml — rotas documentadas sem contraparte na lista canónica (rever):\n', extra.join('\n'));
}

if (!hasWebSocket) {
  console.error('x-websocket /ws/live em falta');
  process.exit(1);
}

console.log(`OK — ${IMPLEMENTED.length} endpoints HTTP alinhados com openapi.yaml`);
process.exit(0);
