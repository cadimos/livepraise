#!/usr/bin/env node
/**
 * CLI restore — paridade com POST /api/restore/apply (CAD-238 / CA-9).
 *
 * Uso: node scripts/restore-livepraise.mjs --in ./backup.zip --groups database --target-home /tmp/lp-test --yes
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
process.env.LIVEPRAISE_APP_ROOT ??= appRoot;

function parseArgs(argv) {
  let zipIn = '';
  let groups = 'database';
  let targetHome = '';
  let yes = false;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--in' && argv[i + 1]) zipIn = argv[++i];
    else if (argv[i] === '--groups' && argv[i + 1]) groups = argv[++i];
    else if (argv[i] === '--target-home' && argv[i + 1]) targetHome = argv[++i];
    else if (argv[i] === '--yes') yes = true;
  }
  if (!zipIn) throw new Error('--in obrigatório');
  return {
    zipIn: path.resolve(zipIn),
    groups: groups.split(',').map((g) => g.trim()).filter(Boolean),
    targetHome: targetHome ? path.resolve(targetHome) : undefined,
    yes,
  };
}

const opts = parseArgs(process.argv);
if (opts.targetHome) {
  process.env.LIVEPRAISE_HOME = opts.targetHome;
}

const { applyRestore, normalizeGroupIds } = await import('../dist/server/backup/index.js');

const ids = normalizeGroupIds(opts.groups);
const result = await applyRestore({
  zipPath: opts.zipIn,
  groups: ids,
  targetHome: opts.targetHome,
  confirmOverwrite: opts.yes,
});

console.log('Restauro concluído.');
console.log(`Grupos: ${result.restoredGroups.join(', ')}`);
if (result.databaseRestored) {
  console.log('Base de dados restaurada — reinicie o servidor.');
}
