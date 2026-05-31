#!/usr/bin/env node
/**
 * CLI backup — paridade com POST /api/backup/create (CAD-238 / CA-9).
 *
 * Uso: node scripts/backup-livepraise.mjs --groups database,media_images --out ./backup.zip
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
process.env.LIVEPRAISE_APP_ROOT ??= appRoot;

function parseArgs(argv) {
  let groups = 'database';
  let out = './livepraise-backup.zip';
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--groups' && argv[i + 1]) {
      groups = argv[++i];
    } else if (argv[i] === '--out' && argv[i + 1]) {
      out = argv[++i];
    }
  }
  return {
    groups: groups.split(',').map((g) => g.trim()).filter(Boolean),
    out: path.resolve(out),
  };
}

const { groups, out } = parseArgs(process.argv);
const { createBackupZip, normalizeGroupIds } = await import(
  '../dist/server/backup/index.js'
);

const ids = normalizeGroupIds(groups);
const result = await createBackupZip({ groups: ids, outputPath: out });
console.log(`Backup criado: ${out}`);
console.log(`Grupos: ${result.groups.join(', ')}`);
console.log(`Bytes: ${fs.statSync(out).size}`);
