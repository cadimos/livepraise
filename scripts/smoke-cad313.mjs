#!/usr/bin/env node
/**
 * Smoke CAD-313 — tipografia runtime, textfill, sync WS.
 * @deprecated Preferir `npm run smoke:textfill` (SM-010).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTextfillIntegrationSmoke, runTextfillUnitTests } from './lib/smoke-textfill.mjs';

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
  await runTextfillIntegrationSmoke({ base, pass, assert });
  runTextfillUnitTests(appRoot, pass);
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-cad313: OK');
