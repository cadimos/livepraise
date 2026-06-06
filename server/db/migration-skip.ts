import type { Database } from './connection.js';

function tableSql(db: Database, tableName: string): string | null {
  const row = db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=? LIMIT 1",
    )
    .get(tableName) as { sql: string | null } | undefined;
  return row?.sql ?? null;
}

function tableExists(db: Database, tableName: string): boolean {
  return tableSql(db, tableName) !== null;
}

/** Migration 004: só quando `users` existe e ainda não aceita papel `admin`. */
export function shouldRunAdminRoleMigration(db: Database): boolean {
  const sql = tableSql(db, 'users');
  if (!sql) return false;
  return !sql.includes("'admin'");
}

/** Migration 006: só quando `external_devices` ainda não inclui perfil `live`. */
export function shouldRunExternalDevicesLiveMigration(db: Database): boolean {
  const sql = tableSql(db, 'external_devices');
  if (!sql) return false;
  return !sql.includes("'live'");
}

/** Migration 007: só quando `external_devices` ainda não inclui perfil `projection`. */
export function shouldRunExternalDevicesProjectionMigration(db: Database): boolean {
  const sql = tableSql(db, 'external_devices');
  if (!sql) return false;
  return !sql.includes("'projection'");
}

export function shouldSkipMigration(db: Database, version: number): boolean {
  switch (version) {
    case 4:
      return !shouldRunAdminRoleMigration(db);
    case 6:
      return !shouldRunExternalDevicesLiveMigration(db);
    case 7:
      return !shouldRunExternalDevicesProjectionMigration(db);
    default:
      return false;
  }
}

/** Marca migration como aplicada sem executar SQL (estado já satisfaz o destino). */
export function recordSkippedMigration(
  db: Database,
  version: number,
  name: string,
): void {
  db.prepare(
    'INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)',
  ).run(version, name);
}
