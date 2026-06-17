#!/usr/bin/env node
/**
 * Smoke TS-030 / TS-031 — artefactos de build das superfícies browser existem após `npm run build`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { assert, pass, resolveAppRoot } from './lib/smoke-helpers.mjs';

const appRoot = resolveAppRoot(import.meta.url);

function mustExist(relPath) {
  assert(fs.existsSync(path.join(appRoot, relPath)), `ficheiro em falta: ${relPath}`);
}

const surfaces = [
  {
    id: 'TS-031-projector',
    files: [
      'dist/apps/projector/projector.js',
      'dist/apps/projector/index.html',
      'dist/apps/projector/projector.css',
    ],
  },
  {
    id: 'TS-031-stage-return',
    files: [
      'dist/apps/stage-return/stage-return.js',
      'dist/apps/stage-return/index.html',
    ],
  },
  {
    id: 'TS-030-web-live',
    files: ['dist/web/live/live.js', 'dist/web/live/index.html'],
  },
  {
    id: 'TS-030-web-external',
    files: [
      'dist/web/external-display/external-display.js',
      'dist/web/external-display/index.html',
    ],
  },
  {
    id: 'TS-030-web-portal',
    files: ['dist/web/portal/portal.js', 'dist/web/portal/index.html'],
  },
  {
    id: 'TS-030-web-remote',
    files: ['dist/web/remote/remote.js', 'dist/web/remote/index.html'],
  },
  {
    id: 'shared-runtime',
    files: [
      'dist/shared/projection-textfill.js',
      'dist/shared/projection-typography-runtime.js',
      'dist/shared/projection-contrast.js',
      'dist/shared/projection-chords.js',
      'dist/shared/ws-live-url.js',
    ],
  },
];

for (const surface of surfaces) {
  for (const file of surface.files) {
    mustExist(file);
  }
  pass(surface.id, `${surface.files.length} ficheiro(s)`);
}

console.log('smoke-build-surfaces: OK');
