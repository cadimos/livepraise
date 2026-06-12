import fs from 'node:fs';
import path from 'node:path';
import { getLivepraiseHome } from '../config/paths.js';
import {
  BACKUP_GROUP_IDS,
  BackupError,
  type BackupGroupId,
} from './types.js';

export interface BackupGroupDef {
  id: BackupGroupId;
  /** Caminho relativo a `~/livepraise` ou null se só via zip (operator_ui). */
  homeRelative: string | null;
  isDirectory: boolean;
  optional: boolean;
}

export const BACKUP_GROUPS: Record<BackupGroupId, BackupGroupDef> = {
  database: {
    id: 'database',
    homeRelative: 'dsw.bd',
    isDirectory: false,
    optional: false,
  },
  media_images: {
    id: 'media_images',
    homeRelative: 'imagens',
    isDirectory: true,
    optional: false,
  },
  media_videos: {
    id: 'media_videos',
    homeRelative: 'videos',
    isDirectory: true,
    optional: false,
  },
  themes: {
    id: 'themes',
    homeRelative: 'themes',
    isDirectory: true,
    optional: false,
  },
  locales: {
    id: 'locales',
    homeRelative: 'locales',
    isDirectory: true,
    optional: false,
  },
  displays: {
    id: 'displays',
    homeRelative: 'displays.json',
    isDirectory: false,
    optional: false,
  },
  projection_state: {
    id: 'projection_state',
    homeRelative: 'projection-background.json',
    isDirectory: false,
    optional: true,
  },
  biblias: {
    id: 'biblias',
    homeRelative: 'biblias',
    isDirectory: true,
    optional: false,
  },
  error_log: {
    id: 'error_log',
    homeRelative: 'error-log.jsonl',
    isDirectory: false,
    optional: true,
  },
  textfill_diagnostics: {
    id: 'textfill_diagnostics',
    homeRelative: 'textfill-diagnostics.jsonl',
    isDirectory: false,
    optional: true,
  },
  operator_ui: {
    id: 'operator_ui',
    homeRelative: null,
    isDirectory: true,
    optional: true,
  },
};

export { BACKUP_GROUP_IDS } from './types.js';

export function isBackupGroupId(value: string): value is BackupGroupId {
  return (BACKUP_GROUP_IDS as readonly string[]).includes(value);
}

export function normalizeGroupIds(raw: unknown): BackupGroupId[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<BackupGroupId>();
  for (const item of raw) {
    const id = String(item ?? '').trim();
    if (isBackupGroupId(id) && !seen.has(id)) seen.add(id);
  }
  return [...seen];
}

export function parseGroupIds(raw: unknown): BackupGroupId[] {
  const groups = normalizeGroupIds(raw);
  if (groups.length === 0) {
    throw new BackupError('Seleccione pelo menos um grupo.', 'invalid_groups');
  }
  return groups;
}

export function resolveGroupHomePath(groupId: BackupGroupId): string | null {
  const def = BACKUP_GROUPS[groupId];
  if (!def.homeRelative) return null;
  return path.join(getLivepraiseHome(), def.homeRelative);
}

export function groupExistsAtHome(groupId: BackupGroupId): boolean {
  const target = resolveGroupHomePath(groupId);
  if (!target) return false;
  return fs.existsSync(target);
}

export function zipEntryPrefix(groupId: BackupGroupId): string {
  return `groups/${groupId}/`;
}

function walkDirectoryBytes(dirPath: string): number {
  let total = 0;
  for (const name of fs.readdirSync(dirPath)) {
    const entryPath = path.join(dirPath, name);
    const stat = fs.statSync(entryPath);
    if (stat.isDirectory()) total += walkDirectoryBytes(entryPath);
    else total += stat.size;
  }
  return total;
}

export function estimateGroupBytes(groupId: BackupGroupId): number {
  const target = resolveGroupHomePath(groupId);
  if (!target || !fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  if (stat.isDirectory()) return walkDirectoryBytes(target);
  return 0;
}
