import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** Raiz do repositório / app (cwd em dev; resources em build empacotado). */
export function getAppRoot(): string {
  return process.env.LIVEPRAISE_APP_ROOT ?? process.cwd();
}

export function getHomedir(): string {
  return process.env.LIVEPRAISE_HOME ?? os.homedir();
}

export function getLivepraiseHome(): string {
  return path.join(getHomedir(), 'livepraise');
}

export function getDatabasePath(): string {
  return path.join(getLivepraiseHome(), 'dsw.bd');
}

/** Origem do payload de primeira instalação. */
export function resolveInstallSource(): string {
  const root = getAppRoot();
  const candidates = [
    path.join(root, 'install', 'livepraise'),
    path.join(root, 'resources', 'install', 'livepraise'),
    path.join(moduleDir, '..', '..', 'install', 'livepraise'),
    path.join(root, 'v0.0.8', 'install', 'livepraise'),
  ];

  for (const candidate of candidates) {
    if (candidate.includes('node_modules')) continue;
    const normalized = path.normalize(candidate);
    if (fs.existsSync(normalized)) return normalized;
  }

  return path.join(root, 'install', 'livepraise');
}

export const DEFAULT_PORT = Number(process.env.LIVEPRAISE_PORT ?? process.env.APP_PORT ?? 3000);
