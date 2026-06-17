#!/usr/bin/env node
/**
 * SM-013 — smoke consolidado fila/dados (ex cad228 + cad234 + cad238).
 */
import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';
import {
  runImportUrlSmoke,
  runQueueRemoveSmoke,
  runBackupRestoreSmoke,
} from './lib/smoke-backup.mjs';

const appRoot = resolveAppRoot(import.meta.url);

function skip(label, detail = '') {
  const suffix = detail ? `: ${detail}` : '';
  console.log(`SKIP ${label}${suffix}`);
}

try {
  await runImportUrlSmoke({ pass, assert, skip, appRoot });
  await runQueueRemoveSmoke({ pass, assert, appRoot });
  await runBackupRestoreSmoke({ pass, assert, skip, appRoot });
} catch (err) {
  console.error(`smoke-backup FAIL: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

console.log('smoke-backup: OK');
