/**
 * SM-010 — asserções textfill/tipografia reutilizáveis (cad313 + tests/).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

/** Testes unitários Node (jsdom) — cada um termina com process.exit. */
export const TEXTFILL_UNIT_TESTS = [
  'tests/projection-textfill-visibility.test.mjs',
  'tests/projection-textfill-fit.test.mjs',
  'tests/projection-textfill-two-pass.test.mjs',
];

/**
 * Smoke HTTP + exports do runtime (paridade smoke-cad313).
 * @param {{ base: string; pass: (id: string, note?: string) => void; assert: (cond: unknown, msg: string) => void }} ctx
 */
export async function runTextfillIntegrationSmoke({ base, pass, assert }) {
  const getDefault = await fetch(`${base}/api/projection-typography`);
  assert(getDefault.ok, `GET default status ${getDefault.status}`);
  const defaultBody = await getDefault.json();
  assert(defaultBody.projectionTypography?.projector, 'GET default projector profile');
  pass('TF-smoke-api', 'GET /api/projection-typography');

  const manifest = await fetch(`${base}/fonts/manifest.json`);
  assert(manifest.ok, `manifest status ${manifest.status}`);
  pass('TF-smoke-fonts', 'GET /fonts/manifest.json');

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
  pass('TF-smoke-put', 'PUT persiste tipografia (loopback operador)');

  const { applyPreviewTextfill, applyOutputTextfill, createProjectionTextfill } = await import(
    '../../dist/shared/projection-textfill.js'
  );
  assert(typeof applyPreviewTextfill === 'function', 'applyPreviewTextfill export');
  assert(typeof applyOutputTextfill === 'function', 'applyOutputTextfill export');
  assert(typeof createProjectionTextfill === 'function', 'createProjectionTextfill export');
  pass('TF-smoke-exports', 'helpers textfill exportados');

  const { createProjectionTypographySession } = await import(
    '../../dist/shared/projection-typography-runtime.js'
  );
  assert(typeof createProjectionTypographySession === 'function', 'typography session');
  pass('TF-smoke-controller', 'sessão tipografia disponível');
}

/**
 * Corre testes unitários em subprocessos (evita process.exit no caller).
 * @param {string} appRoot
 * @param {(id: string, note?: string) => void} [pass]
 */
export function runTextfillUnitTests(appRoot, pass = () => {}) {
  for (const rel of TEXTFILL_UNIT_TESTS) {
    const script = path.join(appRoot, rel);
    const result = spawnSync(process.execPath, [script], {
      cwd: appRoot,
      stdio: 'inherit',
      env: process.env,
    });
    if (result.status !== 0) {
      throw new Error(`${rel} falhou (exit ${result.status ?? 'signal'})`);
    }
    pass(`TF-unit:${path.basename(rel, '.mjs')}`, rel);
  }
}
