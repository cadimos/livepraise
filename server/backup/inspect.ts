import fs from 'node:fs';
import { createRequire } from 'node:module';
import {
  BACKUP_GROUP_IDS,
  MANIFEST_FILE,
  BackupError,
  type BackupGroupId,
  type BackupManifest,
  type InspectBackupResult,
} from './types.js';
import { isBackupGroupId } from './groups.js';
import { assertSafeZipEntryName } from './security.js';

const require = createRequire(import.meta.url);
const yauzl = require('yauzl') as typeof import('yauzl');
type ZipFile = import('yauzl').ZipFile;
type ZipEntry = import('yauzl').Entry;

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

function readEntryBuffer(
  zipfile: ZipFile,
  entry: ZipEntry,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err: Error | null, stream) => {
      if (err || !stream) {
        reject(new BackupError('Falha ao ler entrada zip.', 'invalid_zip'));
        return;
      }
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  });
}

function parseManifest(raw: string): BackupManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupError('Manifesto inválido.', 'invalid_zip');
  }
  const manifest = parsed as BackupManifest;
  if (manifest.manifestVersion !== 1) {
    throw new BackupError('Versão de manifesto não suportada.', 'invalid_zip');
  }
  if (!Array.isArray(manifest.groups)) {
    throw new BackupError('Manifesto inválido: groups em falta.', 'invalid_zip');
  }
  const groups = manifest.groups.filter((g) => isBackupGroupId(String(g))) as BackupGroupId[];
  if (groups.length === 0) {
    throw new BackupError('Manifesto sem grupos.', 'invalid_zip');
  }
  return { ...manifest, groups };
}

export async function inspectBackupZip(zipPath: string): Promise<InspectBackupResult> {
  if (!fs.existsSync(zipPath)) {
    throw new BackupError('Ficheiro zip não encontrado.', 'invalid_zip');
  }

  const zipfile = await openZip(zipPath);
  const entryNames: string[] = [];
  let manifestRaw: string | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      zipfile.readEntry();
      zipfile.on('entry', (entry: ZipEntry) => {
        try {
          assertSafeZipEntryName(entry.fileName);
        } catch {
          reject(new BackupError('Entrada zip inválida (zip slip).', 'invalid_zip'));
          return;
        }
        entryNames.push(entry.fileName);
        if (entry.fileName === MANIFEST_FILE) {
          readEntryBuffer(zipfile, entry)
            .then((buf) => {
              manifestRaw = buf.toString('utf8');
              zipfile.readEntry();
            })
            .catch(reject);
          return;
        }
        zipfile.readEntry();
      });
      zipfile.on('end', () => resolve());
      zipfile.on('error', reject);
    });
  } finally {
    zipfile.close();
  }

  if (!manifestRaw) {
    throw new BackupError('Manifesto backup-manifest.json em falta no zip.', 'invalid_zip');
  }

  const manifest = parseManifest(manifestRaw);
  const groupsPresent = BACKUP_GROUP_IDS.filter((id) =>
    entryNames.some(
      (name) => name.startsWith(`groups/${id}/`) || name === `groups/${id}`,
    ),
  );
  const groupsAbsent = BACKUP_GROUP_IDS.filter((id) => !groupsPresent.includes(id));

  return { manifest, groupsPresent, groupsAbsent };
}

export async function readManifestOnly(zipPath: string): Promise<BackupManifest> {
  const result = await inspectBackupZip(zipPath);
  return result.manifest;
}
