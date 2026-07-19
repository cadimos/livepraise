/**
 * Spawns seguros cross-platform (Windows: evita ENOENT/EINVAL em npm.cmd).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function resolveNpmCli() {
  const besideNode = path.join(
    path.dirname(process.execPath),
    'node_modules',
    'npm',
    'bin',
    'npm-cli.js',
  );
  if (fs.existsSync(besideNode)) return besideNode;
  try {
    return require.resolve('npm/bin/npm-cli.js');
  } catch {
    return null;
  }
}

/**
 * @param {string[]} args argumentos após `npm` (ex.: ['run', 'build'])
 * @param {import('node:child_process').SpawnSyncOptions} [options]
 */
export function runNpm(args, options = {}) {
  const npmCli = resolveNpmCli();
  if (npmCli) {
    return spawnSync(process.execPath, [npmCli, ...args], {
      stdio: 'inherit',
      ...options,
      env: options.env ?? process.env,
    });
  }
  // Fallback raro: shell encontra npm no PATH (Windows .cmd).
  return spawnSync('npm', args, {
    stdio: 'inherit',
    shell: true,
    ...options,
    env: options.env ?? process.env,
  });
}

/**
 * @param {string[]} args argumentos do tsc (ex.: ['-p', 'tsconfig.json'])
 * @param {import('node:child_process').SpawnSyncOptions} [options]
 */
export function runTsc(args, options = {}) {
  const tscJs = require.resolve('typescript/lib/tsc.js');
  return spawnSync(process.execPath, [tscJs, ...args], {
    stdio: 'inherit',
    ...options,
    env: options.env ?? process.env,
  });
}

/**
 * @param {string[]} args ficheiro + args (ex.: ['scripts/foo.mjs'])
 * @param {import('node:child_process').SpawnSyncOptions} [options]
 */
export function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    stdio: 'inherit',
    ...options,
    env: options.env ?? process.env,
  });
}

/** @param {import('node:child_process').SpawnSyncReturns<Buffer|string>} result */
export function assertSpawnOk(result, label) {
  if (result.status !== 0) {
    const detail =
      result.error?.message ??
      (result.signal ? `signal ${result.signal}` : `exit ${result.status ?? 'unknown'}`);
    throw new Error(`${label} falhou (${detail})`);
  }
}
