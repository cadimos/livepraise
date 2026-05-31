import { getDatabasePath } from '../config/paths.js';
import { Database } from './sqlite.js';

export type { Database };
export type DbError = { status: 'Error'; mensagem: unknown };
export type DbRow = Record<string, unknown>;

let mainDb: Database | null = null;

export function getMainDb(): Database {
  if (!mainDb) {
    mainDb = new Database(getDatabasePath());
    mainDb.pragma('journal_mode = WAL');
    mainDb.pragma('foreign_keys = ON');
  }
  return mainDb;
}

export function openDbAt(filePath: string): Database {
  const db = new Database(filePath, { readonly: true });
  db.pragma('foreign_keys = ON');
  return db;
}

export function closeMainDb(): void {
  if (mainDb) {
    mainDb.close();
    mainDb = null;
  }
}

export function dbAll<T extends DbRow = DbRow>(
  db: Database,
  query: string,
  params: unknown[] = [],
): T[] | DbError {
  try {
    return db.prepare(query).all(...params) as T[];
  } catch (err) {
    return { status: 'Error', mensagem: err };
  }
}

export function dbRun(
  db: Database,
  query: string,
  params: unknown[] = [],
): number | DbError {
  try {
    const result = db.prepare(query).run(...params);
    if (/^\s*INSERT/i.test(query)) {
      return Number(result.lastInsertRowid);
    }
    return Number(result.changes);
  } catch (err) {
    return { status: 'Error', mensagem: err };
  }
}

export function isDbError(value: unknown): value is DbError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    (value as DbError).status === 'Error'
  );
}
