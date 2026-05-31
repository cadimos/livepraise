#!/usr/bin/env node
/**
 * Smoke CAD-103 (legado): redireciona para CAD-107 — spec de altura fixa 35vh
 * substitui altura ao conteúdo acordada inicialmente em CAD-103.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const cad107 = path.join(scriptDir, 'smoke-cad107.mjs');
const result = spawnSync(process.execPath, [cad107], { stdio: 'inherit' });
process.exit(result.status ?? 1);
