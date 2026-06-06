import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Database } from './connection.js';
import { configureDatabasePragmas, getMainDb, resetMainDb } from './connection.js';
import { Database as SqliteDatabase } from './sqlite.js';
import {
  recordSkippedMigration,
  shouldSkipMigration,
} from './migration-skip.js';

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

function applyPendingMigrations(db: Database): number {
  const applied = getAppliedVersions(db);
  const migrations = loadMigrations();
  let count = 0;

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    if (shouldSkipMigration(db, migration.version)) {
      recordSkippedMigration(db, migration.version, migration.name);
      count += 1;
      continue;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(migration.sql);
      db.prepare(
        'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
      ).run(migration.version, migration.name);
      db.exec('COMMIT');
      count += 1;
    } catch (err) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // ignore rollback failure on corrupt state
      }
      throw err;
    }
  }

  return count;
}

/** Aplica migrations pendentes (CA-R04). */
export function runMigrations(): number {
  return applyPendingMigrations(getMainDb());
}

/** Cria `dsw.bd` novo (após quarentena ou install sem payload SQL). */
export function bootstrapEmptyDatabase(dbPath: string): number {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  resetMainDb();
  const db = new SqliteDatabase(dbPath);
  try {
    configureDatabasePragmas(db);
    return applyPendingMigrations(db);
  } finally {
    db.close();
    resetMainDb();
  }
}

/** Maior versão de migration embarcada na app (validação restore CAD-238). */
export function getEmbeddedMaxMigrationVersion(): number {
  const migrations = loadMigrations();
  if (migrations.length === 0) return 0;
  return Math.max(...migrations.map((m) => m.version));
}
