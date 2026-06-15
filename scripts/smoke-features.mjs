#!/usr/bin/env node
/**
 * SM-009 — entrypoint único para smokes de feature (manual / pré-release).
 *
 * Uso:
 *   node scripts/smoke-features.mjs
 *   node scripts/smoke-features.mjs --only=locales
 *   node scripts/smoke-features.mjs --only=locales,audit,version
 *   node scripts/smoke-features.mjs --list
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pass, resolveAppRoot } from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);
const scriptsDir = path.join(appRoot, 'scripts');

/** @type {Record<string, { script: string; prep?: string[]; label: string }>} */
const FEATURES = {
  locales: {
    label: 'locales i18n',
    prep: ['npm', 'run', 'sync:locales'],
    script: 'smoke-locales-i18n.mjs',
  },
  audit: {
    label: 'auditoria e retenção',
    script: 'smoke-audit-retention.mjs',
  },
  'video-watcher': {
    label: 'watcher de vídeos',
    script: 'smoke-video-watcher.mjs',
  },
  'musica-export': {
    label: 'export/import louvores',
    script: 'smoke-musica-export.mjs',
  },
  version: {
    label: 'sync de versão',
    prep: ['node', 'scripts/sync-app-version.mjs'],
    script: 'smoke-version-sync.mjs',
  },
  textfill: {
    label: 'textfill + tipografia (API + unit tests)',
    script: 'smoke-textfill.mjs',
  },
  'typography-qa': {
    label: 'QA tipografia CA-1–14',
    script: 'smoke-typography-qa.mjs',
  },
};

const ALIASES = {
  'version-sync': 'version',
  locales: 'locales',
  audit: 'audit',
  'video-watcher': 'video-watcher',
  'musica-export': 'musica-export',
  textfill: 'textfill',
  typography: 'textfill',
  'typography-qa': 'typography-qa',
};

function printHelp() {
  console.log(`smoke-features — smokes de feature (SM-009)

Uso:
  node scripts/smoke-features.mjs [--only=dom1,dom2] [--list]

Domínios: ${Object.keys(FEATURES).join(', ')}

Aliases: version-sync → version

Requer \`npm run build:server\` antes (ou use \`npm run smoke:features\`).
`);
}

function parseOnlyArg(argv) {
  const listFlag = argv.includes('--list');
  if (listFlag) {
    for (const [key, feature] of Object.entries(FEATURES)) {
      console.log(`${key}\t${feature.label}\t${feature.script}`);
    }
    process.exit(0);
  }

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const onlyArg = argv.find((arg) => arg.startsWith('--only='));
  if (!onlyArg) {
    return Object.keys(FEATURES);
  }

  const raw = onlyArg.slice('--only='.length).trim();
  if (!raw) {
    throw new Error('--only= requer pelo menos um domínio');
  }

  const selected = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const resolved = [];
  for (const name of selected) {
    const key = ALIASES[name] ?? name;
    if (!FEATURES[key]) {
      throw new Error(
        `Domínio desconhecido: ${name}. Válidos: ${Object.keys(FEATURES).join(', ')}`,
      );
    }
    if (!resolved.includes(key)) resolved.push(key);
  }
  return resolved;
}

function runStep(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${label} falhou (exit ${result.status ?? 'signal'})`);
  }
}

function runFeature(key) {
  const feature = FEATURES[key];
  console.log(`\n=== smoke-features:${key} (${feature.label}) ===`);

  if (feature.prep) {
    const [command, ...args] = feature.prep;
    runStep(`${key} prep`, command, args);
  }

  runStep(key, process.execPath, [path.join(scriptsDir, feature.script)]);
  pass(`smoke-features:${key}`, feature.label);
}

const selected = parseOnlyArg(process.argv.slice(2));

for (const key of selected) {
  runFeature(key);
}

console.log(`\nsmoke-features: OK (${selected.join(', ')})`);
