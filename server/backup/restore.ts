import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { getLivepraiseHome } from '../config/paths.js';
import { closeMainDb, getMainDb } from '../db/connection.js';
import { setBackupMode } from './backup-mode.js';
import {
  BACKUP_GROUPS,
  isBackupGroupId,
  zipEntryPrefix,
} from './groups.js';
import { inspectBackupZip } from './inspect.js';
import { assertBackupDatabaseCompatible } from './migrations-check.js';
import { assertSafeZipEntryName } from './security.js';
import { BackupError, type BackupGroupId } from './types.js';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl') as typeof import('yauzl');
type ZipFile = import('yauzl').ZipFile;
type ZipEntry = import('yauzl').Entry;

const MANIFEST_ENTRY = 'backup-manifest.json';

export interface ApplyRestoreOptions {
  zipPath: string;
  groups: BackupGroupId[];
  targetHome?: string;
  confirmOverwrite?: boolean;
}

export interface ApplyRestoreResult {
  restoredGroups: BackupGroupId[];
  databaseRestored: boolean;
  sessionsInvalidated: boolean;
  operatorUiFiles: { name: string; content: string }[];
}

function openZip(zipPath: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        reject(new BackupError('Ficheiro inválido ou corrompido.', 'invalid_zip'));
        return;
      }
      resolve(zipfile);
    });
  });
}

export function destGroupHasData(groupId: BackupGroupId, home?: string): boolean {
  const def = BACKUP_GROUPS[groupId];
  if (!def.homeRelative || groupId === 'operator_ui') return false;
  const target = path.join(home ?? getLivepraiseHome(), def.homeRelative);
  return fs.existsSync(target);
}

export function groupsNeedingOverwrite(
  groups: BackupGroupId[],
  home?: string,
): BackupGroupId[] {
  return groups.filter((g) => destGroupHasData(g, home));
}

function orderGroupsForRestore(groups: BackupGroupId[]): BackupGroupId[] {
  const withoutDb = groups.filter((g) => g !== 'database');
  const withDb = groups.includes('database') ? (['database'] as BackupGroupId[]) : [];
  return [...withoutDb, ...withDb];
}

function invalidateAuthSessions(): void {
  const db = getMainDb();
  const table = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='auth_sessions'",
    )
    .get() as { name?: string } | undefined;
  if (!table?.name) return;
  db.exec('DELETE FROM auth_sessions');
}

async function readDatabaseFromZip(zipPath: string, tempPath: string): Promise<void> {
  const zipfile = await openZip(zipPath);
  const dbEntryPrefix = zipEntryPrefix('database');

  try {
    await new Promise<void>((resolve, reject) => {
      let found = false;
      zipfile.readEntry();
      zipfile.on('entry', (entry: ZipEntry) => {
        if (
          entry.fileName.startsWith(dbEntryPrefix) &&
          entry.fileName.endsWith('dsw.bd')
        ) {
          found = true;
          fs.mkdirSync(path.dirname(tempPath), { recursive: true });
          zipfile.openReadStream(entry, (err: Error | null, stream) => {
            if (err || !stream) {
              reject(new BackupError('Falha ao ler BD do backup.', 'invalid_zip'));
              return;
            }
            const out = fs.createWriteStream(tempPath);
            stream.pipe(out);
            out.on('close', () => resolve());
            out.on('error', reject);
            stream.on('error', reject);
          });
          return;
        }
        zipfile.readEntry();
      });
      zipfile.on('end', () => {
        if (!found) {
          reject(new BackupError('Base de dados em falta no zip.', 'invalid_zip'));
        }
      });
      zipfile.on('error', reject);
    });
  } finally {
    zipfile.close();
  }
}

export async function applyRestore(
  options: ApplyRestoreOptions,
): Promise<ApplyRestoreResult> {
  const targetHome = options.targetHome ?? getLivepraiseHome();
  const selected = options.groups.filter((g) => isBackupGroupId(g));
  if (selected.length === 0) {
    throw new BackupError('Seleccione pelo menos um grupo para restaurar.', 'invalid_groups');
  }

  const inspection = await inspectBackupZip(options.zipPath);
  for (const groupId of selected) {
    if (!inspection.groupsPresent.includes(groupId)) {
      throw new BackupError(
        `Grupo "${groupId}" não está presente neste backup.`,
        'invalid_groups',
      );
    }
  }

  const needsOverwrite = groupsNeedingOverwrite(selected, targetHome);
  if (needsOverwrite.length > 0 && !options.confirmOverwrite) {
    throw new BackupError(
      'Confirme a substituição dos dados existentes.',
      'confirm_required',
    );
  }

  if (selected.includes('database')) {
    const tempDb = path.join(targetHome, `.restore-check-${Date.now()}.bd`);
    try {
      await readDatabaseFromZip(options.zipPath, tempDb);
      assertBackupDatabaseCompatible(tempDb);
    } finally {
      fs.rmSync(tempDb, { force: true });
    }
  }

  fs.mkdirSync(targetHome, { recursive: true });
  setBackupMode(true);
  const operatorUiFiles: { name: string; content: string }[] = [];

  try {
    const ordered = orderGroupsForRestore(selected);
    if (options.confirmOverwrite) {
      for (const groupId of ordered) {
        const def = BACKUP_GROUPS[groupId];
        if (!def.homeRelative || !def.isDirectory) continue;
        const target = path.join(targetHome, def.homeRelative);
        if (fs.existsSync(target)) {
          fs.rmSync(target, { recursive: true, force: true });
        }
      }
    }
    const zipfile = await openZip(options.zipPath);
    const prefixes = new Set(ordered.map((g) => zipEntryPrefix(g)));

    try {
      await new Promise<void>((resolve, reject) => {
        zipfile.readEntry();
        zipfile.on('entry', (entry: ZipEntry) => {
          if (entry.fileName === MANIFEST_ENTRY) {
            zipfile.readEntry();
            return;
          }
          try {
            assertSafeZipEntryName(entry.fileName);
          } catch {
            reject(new BackupError('Entrada zip inválida (zip slip).', 'invalid_zip'));
            return;
          }
          const matches = [...prefixes].some((p) => entry.fileName.startsWith(p));
          if (!matches) {
            zipfile.readEntry();
            return;
          }

          const relative = entry.fileName.replace(/^groups\/[^/]+\/?/, '');
          const groupMatch = /^groups\/([^/]+)/.exec(entry.fileName);
          const groupId = groupMatch?.[1] as BackupGroupId | undefined;
          if (!groupId || !ordered.includes(groupId)) {
            zipfile.readEntry();
            return;
          }

          const def = BACKUP_GROUPS[groupId];
          if (groupId === 'operator_ui' && relative && !entry.fileName.endsWith('/')) {
            zipfile.openReadStream(entry, (err: Error | null, stream) => {
              if (err || !stream) {
                reject(new BackupError('Falha na extração.', 'restore_failed'));
                return;
              }
              const chunks: Buffer[] = [];
              stream.on('data', (c: Buffer) => chunks.push(c));
              stream.on('end', () => {
                const name = path.basename(relative);
                if (name.endsWith('.json')) {
                  operatorUiFiles.push({
                    name,
                    content: Buffer.concat(chunks).toString('utf8'),
                  });
                }
                zipfile.readEntry();
              });
              stream.on('error', reject);
            });
            return;
          }
          let destPath: string;
          if (relative && relative.length > 0) {
            if (!def.homeRelative) {
              zipfile.readEntry();
              return;
            }
            destPath = def.isDirectory
              ? path.join(targetHome, def.homeRelative, relative)
              : path.join(targetHome, def.homeRelative);
          } else if (def.homeRelative) {
            destPath = path.join(targetHome, def.homeRelative);
          } else {
            zipfile.readEntry();
            return;
          }

          if (entry.fileName.endsWith('/')) {
            fs.mkdirSync(destPath, { recursive: true });
            zipfile.readEntry();
            return;
          }

          if (groupId === 'database') {
            closeMainDb();
          }

          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          zipfile.openReadStream(entry, (err: Error | null, stream) => {
            if (err || !stream) {
              reject(new BackupError('Falha na extração.', 'restore_failed'));
              return;
            }
            const out = fs.createWriteStream(destPath);
            stream.pipe(out);
            out.on('close', () => zipfile.readEntry());
            out.on('error', reject);
            stream.on('error', reject);
          });
        });
        zipfile.on('end', () => resolve());
        zipfile.on('error', reject);
      });
    } finally {
      zipfile.close();
    }

    let sessionsInvalidated = false;
    if (selected.includes('database')) {
      closeMainDb();
      const liveHome = path.resolve(getLivepraiseHome());
      const restoreTarget = path.resolve(targetHome);
      if (restoreTarget === liveHome) {
        invalidateAuthSessions();
        sessionsInvalidated = true;
      }
    }

    return {
      restoredGroups: ordered,
      databaseRestored: selected.includes('database'),
      sessionsInvalidated,
      operatorUiFiles,
    };
  } catch (err) {
    if (err instanceof BackupError) throw err;
    throw new BackupError(
      err instanceof Error ? err.message : 'Falha no restauro.',
      'restore_failed',
    );
  } finally {
    setBackupMode(false);
  }
}
