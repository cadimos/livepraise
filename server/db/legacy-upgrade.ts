import fs from 'node:fs';
import path from 'node:path';
import { getDatabasePath, getLivepraiseHome } from '../config/paths.js';
import { Database } from './sqlite.js';

function quarantinePath(filePath: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${filePath}.corrupt-${stamp}`;
}

function listDatabaseSidecars(dbPath: string): string[] {
  return [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
}

/** Base legada v0.0.8: tem tabelas de repertório mas ainda sem `schema_migrations`. */
export function isLegacyV008Database(dbPath: string): boolean {
  if (!fs.existsSync(dbPath)) return false;
  try {
    const db = new Database(dbPath, { readonly: true });
    const hasMigrations = db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
      )
      .get() as { ok: number } | undefined;
    if (hasMigrations) {
      db.close();
      return false;
    }
    const hasLegacy = db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='musica'",
      )
      .get() as { ok: number } | undefined;
    db.close();
    return Boolean(hasLegacy);
  } catch {
    return false;
  }
}

function backupLegacyDatabase(dbPath: string): string {
  const backupDir = path.join(getLivepraiseHome(), 'backup', 'auto-upgrade');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupBase = path.join(backupDir, `dsw.bd.${stamp}`);
  for (const src of listDatabaseSidecars(dbPath)) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, `${backupBase}${src === dbPath ? '' : src.slice(dbPath.length)}`);
    }
  }
  return backupBase;
}

function quarantineSidecars(dbPath: string): void {
  for (const ext of ['-wal', '-shm']) {
    const sidecar = `${dbPath}${ext}`;
    if (!fs.existsSync(sidecar)) continue;
    const target = quarantinePath(sidecar);
    fs.renameSync(sidecar, target);
    console.warn(`[livepraise-db] Ficheiro auxiliar isolado: ${target}`);
  }
}

function checkpointWal(dbPath: string): void {
  const walPath = `${dbPath}-wal`;
  if (!fs.existsSync(walPath)) return;
  let db: Database | null = null;
  try {
    db = new Database(dbPath);
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  } catch (err) {
    console.warn(
      '[livepraise-db] wal_checkpoint falhou; a remover WAL/SHM inconsistentes:',
      err instanceof Error ? err.message : err,
    );
    quarantineSidecars(dbPath);
  } finally {
    db?.close();
  }
}

function canQueryDatabase(dbPath: string): boolean {
  let db: Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true });
    const row = db.prepare('PRAGMA integrity_check').get() as
      | { integrity_check: string }
      | undefined;
    return row?.integrity_check === 'ok';
  } catch {
    return false;
  } finally {
    db?.close();
  }
}

function quarantineCorruptDatabase(dbPath: string): string {
  const backupBase = quarantinePath(dbPath);
  for (const src of listDatabaseSidecars(dbPath)) {
    if (!fs.existsSync(src)) continue;
    const suffix = src === dbPath ? '' : src.slice(dbPath.length);
    fs.renameSync(src, `${backupBase}${suffix}`);
  }
  return backupBase;
}

/**
 * Prepara `dsw.bd` antes de migrations (upgrade v0.0.8 → 1.x).
 * - Backup automático da base legada
 * - Checkpoint/isolamento de WAL ao mudar de SO ou após cópia manual
 * - Detecção de corrupção com quarentena e mensagem acionável
 */
export function prepareLegacyDatabaseFile(): void {
  const dbPath = getDatabasePath();
  if (!fs.existsSync(dbPath)) return;

  if (isLegacyV008Database(dbPath)) {
    const backup = backupLegacyDatabase(dbPath);
    console.warn(
      `[livepraise-db] Upgrade legado v0.0.8 detectado. Backup em ${backup}`,
    );
  }

  checkpointWal(dbPath);

  if (canQueryDatabase(dbPath)) return;

  const quarantine = quarantineCorruptDatabase(dbPath);
  console.error(
    `[livepraise-db] Base corrompida isolada em ${quarantine}. ` +
      'Será criada uma base nova; repertório na BD anterior fica no ficheiro em quarentena. ' +
      'Para recuperar dados de v0.0.8, restaure um `dsw.bd` íntegro (com WAL/SHM, app encerrado) ' +
      'ou use Backup/Restore em Configurações.',
  );
}

/** Indica que `dsw.bd` foi removido por corrupção e precisa de bootstrap via migrations. */
export function databaseWasQuarantined(): boolean {
  const dbPath = getDatabasePath();
  if (fs.existsSync(dbPath)) return false;
  const dir = path.dirname(dbPath);
  try {
    return fs
      .readdirSync(dir)
      .some((name) => name.startsWith('dsw.bd.corrupt-'));
  } catch {
    return false;
  }
}
