import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import type { Writable } from 'node:stream';
import { getAppRoot, getLivepraiseHome } from '../config/paths.js';
import { getMainDb } from '../db/connection.js';
import {
  BACKUP_GROUPS,
  groupExistsAtHome,
  isBackupGroupId,
  zipEntryPrefix,
  type BackupGroupDef,
} from './groups.js';
import { setBackupMode } from './backup-mode.js';
import {
  MANIFEST_FILE,
  MANIFEST_VERSION,
  BackupError,
  type BackupGroupId,
  type BackupManifest,
} from './types.js';

interface BackupArchiver {
  pipe<T extends NodeJS.WritableStream>(destination: T): T;
  append(source: string | Buffer, data: { name: string }): void;
  file(filepath: string, data: { name: string }): void;
  directory(dirpath: string, destpath: string): void;
  finalize(): void;
  pointer(): number;
  on(event: 'error', listener: (err: Error) => void): BackupArchiver;
  on(event: 'warning', listener: (err: unknown) => void): BackupArchiver;
  on(event: 'end', listener: () => void): BackupArchiver;
}

const require = createRequire(import.meta.url);
const archiverMod = require('archiver') as {
  create: (format: string, options?: { zlib?: { level?: number } }) => BackupArchiver;
};

function readAppVersion(): string {
  const pkgPath = path.join(getAppRoot(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { version?: string };
  return pkg.version ?? '0.0.0';
}

function mapIoError(err: unknown): never {
  const code = (err as NodeJS.ErrnoException)?.code;
  if (code === 'ENOSPC') {
    throw new BackupError(
      'Espaço em disco insuficiente para criar o backup.',
      'disk_full',
    );
  }
  if (code === 'EACCES' || code === 'EPERM') {
    throw new BackupError(
      'Sem permissão para escrever no destino.',
      'permission_denied',
    );
  }
  throw err;
}

function appendPathToArchive(
  archive: BackupArchiver,
  sourcePath: string,
  archivePath: string,
  isDirectory: boolean,
): void {
  if (!fs.existsSync(sourcePath)) return;
  if (isDirectory) {
    archive.directory(sourcePath, archivePath);
  } else {
    archive.file(sourcePath, { name: archivePath });
  }
}

function addGroupToArchive(
  archive: BackupArchiver,
  groupId: BackupGroupId,
  operatorUiDir?: string,
): void {
  const def = BACKUP_GROUPS[groupId];
  const prefix = zipEntryPrefix(groupId);

  if (groupId === 'operator_ui') {
    if (operatorUiDir && fs.existsSync(operatorUiDir)) {
      archive.directory(operatorUiDir, prefix.replace(/\/$/, ''));
    }
    return;
  }

  const homePath = def.homeRelative
    ? path.join(getLivepraiseHome(), def.homeRelative)
    : null;
  if (!homePath || !fs.existsSync(homePath)) {
    if (!def.optional) {
      throw new BackupError(
        `Grupo "${groupId}" não encontrado em ${homePath ?? 'origem'}.`,
        'invalid_groups',
      );
    }
    return;
  }

  if (def.isDirectory) {
    appendPathToArchive(archive, homePath, prefix.replace(/\/$/, ''), true);
  } else {
    appendPathToArchive(
      archive,
      homePath,
      `${prefix}${path.basename(homePath)}`,
      false,
    );
  }
}

export interface CreateBackupOptions {
  groups: BackupGroupId[];
  outputPath?: string;
  outputStream?: Writable;
  /** Export operator_ui from Electron (directório temporário). */
  operatorUiDir?: string;
}

async function runArchive(
  options: CreateBackupOptions,
  manifest: BackupManifest,
): Promise<{ bytes: number }> {
  const output =
    options.outputStream ??
    fs.createWriteStream(options.outputPath!);

  return new Promise((resolve, reject) => {
    const archive = archiverMod.create('zip', { zlib: { level: 6 } });

    output.on('error', (err: Error) => reject(mapIoError(err)));
    archive.on('error', (err: Error) => reject(mapIoError(err)));
    archive.on('warning', (err: unknown) => {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      reject(err);
    });

    if (options.outputPath) {
      output.on('close', () => {
        const bytes =
          'bytesWritten' in output
            ? Number((output as fs.WriteStream).bytesWritten)
            : archive.pointer();
        resolve({ bytes });
      });
    } else {
      archive.on('end', () => resolve({ bytes: archive.pointer() }));
    }

    archive.pipe(output);
    archive.append(JSON.stringify(manifest, null, 2), { name: MANIFEST_FILE });

    for (const groupId of manifest.groups) {
      try {
        addGroupToArchive(archive, groupId, options.operatorUiDir);
      } catch (err) {
        reject(err);
        return;
      }
    }

    archive.finalize();
  });
}

export async function createBackupZip(
  options: CreateBackupOptions,
): Promise<BackupManifest & { bytes: number }> {
  const groups = options.groups.filter((g) => isBackupGroupId(g));
  if (groups.length === 0) {
    throw new BackupError('Seleccione pelo menos um grupo para backup.', 'invalid_groups');
  }
  if (!options.outputPath && !options.outputStream) {
    throw new BackupError('Destino de saída obrigatório.', 'invalid_groups');
  }

  if (options.outputPath) {
    await fs.promises.mkdir(path.dirname(path.resolve(options.outputPath)), {
      recursive: true,
    });
  }

  setBackupMode(true);
  try {
    if (groups.includes('database')) {
      const db = getMainDb();
      db.pragma('wal_checkpoint(FULL)');
    }

    const manifest: BackupManifest = {
      manifestVersion: MANIFEST_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: readAppVersion(),
      livepraiseHome: 'livepraise',
      groups,
    };

    const { bytes } = await runArchive(options, manifest);
    return { ...manifest, bytes };
  } finally {
    setBackupMode(false);
  }
}

export function listDefaultBackupGroups(): BackupGroupId[] {
  return (Object.keys(BACKUP_GROUPS) as BackupGroupId[]).filter((id) => {
    const def: BackupGroupDef = BACKUP_GROUPS[id];
    if (id === 'operator_ui') return false;
    if (def.optional) return groupExistsAtHome(id);
    return true;
  });
}
