import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './connection.js';
import { getMainDb } from './connection.js';

import { getAppRoot } from '../config/paths.js';

function resolveMigrationsDir(): string {
  const compiledDir = path.dirname(fileURLToPath(import.meta.url));
  const bundled = path.join(compiledDir, 'migrations');
  if (fs.existsSync(bundled)) return bundled;
  return path.join(getAppRoot(), 'server', 'db', 'migrations');
}

interface MigrationFile {
  version: number;
  name: string;
  sql: string;
}

function loadMigrations(): MigrationFile[] {
  const migrationsDir = resolveMigrationsDir();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((file) => {
    const match = /^(\d+)_(.+)\.sql$/.exec(file);
    if (!match) {
      throw new Error(`Nome de migration inválido: ${file}`);
    }
    return {
      version: Number(match[1]),
      name: match[2],
      sql: fs.readFileSync(path.join(migrationsDir, file), 'utf8'),
    };
  });
}

function ensureMigrationTable(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getAppliedVersions(db: Database): Set<number> {
  ensureMigrationTable(db);
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as {
    version: number;
  }[];
  return new Set(rows.map((r) => r.version));
}

/** Aplica migrations pendentes (CA-R04). */
export function runMigrations(): number {
  const db = getMainDb();
  const applied = getAppliedVersions(db);
  const migrations = loadMigrations();
  let count = 0;

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    db.exec(migration.sql);
    db.prepare(
      'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
    ).run(migration.version, migration.name);
    count += 1;
  }

  return count;
}
