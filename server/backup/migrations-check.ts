import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAppRoot } from '../config/paths.js';
import { openDbAt, type Database } from '../db/connection.js';
import { BackupError } from './types.js';

function resolveMigrationsDir(): string {
  const compiledDir = path.dirname(fileURLToPath(import.meta.url));
  const bundled = path.join(compiledDir, '..', 'db', 'migrations');
  if (fs.existsSync(bundled)) return bundled;
  return path.join(getAppRoot(), 'server', 'db', 'migrations');
}

export function getLatestEmbeddedMigrationVersion(): number {
  const migrationsDir = resolveMigrationsDir();
  if (!fs.existsSync(migrationsDir)) return 0;
  let max = 0;
  for (const file of fs.readdirSync(migrationsDir)) {
    const match = /^(\d+)_/.exec(file);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

export function getAppliedMaxMigrationVersion(db: Database): number {
  const table = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
    )
    .get() as { name?: string } | undefined;
  if (!table?.name) return 0;
  const row = db
    .prepare('SELECT MAX(version) AS v FROM schema_migrations')
    .get() as { v: number | null } | undefined;
  return row?.v ?? 0;
}

/** CA-7: backup BD mais novo que app → recusa restore. */
export function assertBackupDatabaseCompatible(backupDbPath: string): void {
  const appMax = getLatestEmbeddedMigrationVersion();
  const backupDb = openDbAt(backupDbPath);
  try {
    const backupMax = getAppliedMaxMigrationVersion(backupDb);
    if (backupMax > appMax) {
      throw new BackupError(
        'Este backup é de uma versão mais recente do Live Praise. Actualize a aplicação antes de restaurar.',
        'migration_newer',
      );
    }
  } finally {
    backupDb.close();
  }
}
