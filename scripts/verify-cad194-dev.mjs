#!/usr/bin/env node
/**
 * Verifica servidor em execução (ex.: após npm run dev) — CAD-194 import routes.
 * Uso: node scripts/verify-cad194-dev.mjs
 *      LIVEPRAISE_PORT=3000 node scripts/verify-cad194-dev.mjs
 */
const port = Number(process.env.LIVEPRAISE_PORT ?? process.env.APP_PORT ?? 3000);
const base = `http://127.0.0.1:${port}`;

function fail(message) {
  console.error(`verify-cad194-dev: FAIL — ${message}`);
  process.exit(1);
}

async function check(path, predicate, label) {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) fail(`${label}: HTTP ${res.status} em ${path}`);
  const body = await res.json();
  if (!predicate(body)) fail(`${label}: resposta inesperada em ${path}`);
  return body;
}

try {
  await check(
    '/health',
    (b) => b.features?.cad194 === true,
    'health.features.cad194',
  );
  await check(
    '/video/importar/ping',
    (b) => b.cad194 === true,
    'ping cad194',
  );
  const yt = await fetch(`${base}/api/queue/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: 'https://youtu.be/dQw4w9WgXcQ',
      category: 'fila',
    }),
  });
  if (yt.status === 404) {
    fail('POST /api/queue/youtube → HTTP 404 (servidor obsoleto na porta?)');
  }
  if (!yt.ok) {
    const text = await yt.text();
    fail(`POST /api/queue/youtube → HTTP ${yt.status}: ${text.slice(0, 200)}`);
  }
  const ytBody = await yt.json();
  if (ytBody.mode !== 'local' && ytBody.mode !== 'embed') {
    fail('resposta YouTube sem mode local/embed');
  }
  console.log(`verify-cad194-dev: OK (porta ${port}, mode=${ytBody.mode})`);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
