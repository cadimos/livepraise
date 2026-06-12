export const MANIFEST_VERSION = 1;
export const BACKUP_MANIFEST_VERSION = MANIFEST_VERSION;
export const MANIFEST_FILE = 'backup-manifest.json';

export const BACKUP_GROUP_IDS = [
  'database',
  'media_images',
  'media_videos',
  'themes',
  'locales',
  'displays',
  'projection_state',
  'biblias',
  'error_log',
  'textfill_diagnostics',
  'operator_ui',
] as const;

export type BackupGroupId = (typeof BACKUP_GROUP_IDS)[number];

export interface BackupManifest {
  manifestVersion: number;
  createdAt: string;
  appVersion: string;
  livepraiseHome: string;
  groups: BackupGroupId[];
}

export interface InspectBackupResult {
  manifest: BackupManifest;
  groupsPresent: BackupGroupId[];
  groupsAbsent: BackupGroupId[];
}

export type BackupErrorCode =
  | 'invalid_groups'
  | 'disk_full'
  | 'permission_denied'
  | 'invalid_zip'
  | 'migration_newer'
  | 'confirm_required'
  | 'restore_failed'
  | 'backup_in_progress';

export class BackupError extends Error {
  constructor(
    message: string,
    readonly code: BackupErrorCode,
  ) {
    super(message);
    this.name = 'BackupError';
  }
}
