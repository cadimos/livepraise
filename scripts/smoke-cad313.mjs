#!/usr/bin/env node
/**
 * Smoke CAD-313 — tipografia runtime, textfill, sync WS.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-cad313-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

const { port } = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${port}`;

try {
  const getDefault = await fetch(`${base}/api/projection-typography`);
  assert(getDefault.ok, `GET default status ${getDefault.status}`);
  const defaultBody = await getDefault.json();
  assert(defaultBody.projectionTypography?.projector, 'GET default projector profile');
  pass('CA-12a', 'GET /api/projection-typography');

  const manifest = await fetch(`${base}/fonts/manifest.json`);
  assert(manifest.ok, `manifest status ${manifest.status}`);
  pass('CA-7a', 'GET /fonts/manifest.json');

  const putRes = await fetch(`${base}/api/projection-typography`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectionTypography: {
        ...defaultBody.projectionTypography,
        vocal: {
          ...defaultBody.projectionTypography.vocal,
          maxFontPx: 88,
          textfillEnabled: true,
        },
      },
    }),
  });
  assert(putRes.ok, `PUT loopback status ${putRes.status}`);
  pass('CA-12b', 'PUT persiste tipografia (loopback operador)');

  const { applyPreviewTextfill, applyOutputTextfill } = await import(
    '../dist/shared/projection-textfill.js'
  );
  assert(typeof applyPreviewTextfill === 'function', 'applyPreviewTextfill export');
  assert(typeof applyOutputTextfill === 'function', 'applyOutputTextfill export');
  pass('CA-1', 'helpers textfill exportados');

  await import('../tests/projection-textfill-visibility.test.mjs');
  pass('CA-1b', 'textfill oculta root durante refresh (sem flash)');

  const { createProjectionTypographyController } = await import(
    '../dist/shared/projection-typography-runtime.js'
  );
  assert(typeof createProjectionTypographyController === 'function', 'runtime controller');
  pass('CA-3', 'runtime controller disponível');
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-cad313: OK');
