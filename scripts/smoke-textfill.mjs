#!/usr/bin/env node
/**
 * SM-010 — smoke consolidado textfill (API + exports + tests/projection-textfill-*).
 */
import {
  assert,
  configureSmokeEnv,
  createSmokeHome,
  pass,
  resolveAppRoot,
} from './lib/smoke-helpers.mjs';
import {
  runTextfillIntegrationSmoke,
  runTextfillUnitTests,
} from './lib/smoke-textfill.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const testHome = createSmokeHome('livepraise-textfill-');

configureSmokeEnv({ home: testHome, appRoot, port: '0' });

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);

try {
  const { port } = await startLivepraiseServer(0);
  const base = `http://127.0.0.1:${port}`;

  await runTextfillIntegrationSmoke({ base, pass, assert });
  runTextfillUnitTests(appRoot, pass);

  console.log('smoke-textfill: OK');
} finally {
  await stopLivepraiseServer();
}
