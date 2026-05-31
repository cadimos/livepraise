/**
 * Camada SQLite via `node:sqlite` (Node ≥22 / Electron 42).
 * API compatível com o subset usado pelo projecto (ex-better-sqlite3).
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

function bindParams(params: unknown[]): SQLInputValue[] {
  return params as SQLInputValue[];
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

export class Statement {
  constructor(private readonly stmt: ReturnType<DatabaseSync['prepare']>) {}

  all(...params: unknown[]): Record<string, unknown>[] {
    if (params.length === 0) {
      return this.stmt.all() as Record<string, unknown>[];
    }
    return this.stmt.all(...bindParams(params)) as Record<string, unknown>[];
  }

  get(...params: unknown[]): Record<string, unknown> | undefined {
    if (params.length === 0) {
      return this.stmt.get() as Record<string, unknown> | undefined;
    }
    return this.stmt.get(...bindParams(params)) as Record<string, unknown> | undefined;
  }

  run(...params: unknown[]): RunResult {
    const result =
      params.length === 0 ? this.stmt.run() : this.stmt.run(...bindParams(params));
    return {
      changes: Number(result.changes ?? 0),
      lastInsertRowid: result.lastInsertRowid ?? 0,
    };
  }
}

export interface DatabaseOptions {
  readonly?: boolean;
}

export class Database {
  private readonly db: DatabaseSync;

  constructor(location: string, options?: DatabaseOptions) {
    this.db = new DatabaseSync(location, {
      open: true,
      readOnly: options?.readonly ?? false,
    });
  }

  pragma(command: string): void {
    this.db.exec(`PRAGMA ${command}`);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  prepare(sql: string): Statement {
    return new Statement(this.db.prepare(sql));
  }

  close(): void {
    this.db.close();
  }
}
