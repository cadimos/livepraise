export { isBackupModeActive, setBackupMode } from './backup-mode.js';
export { createBackupZip, listDefaultBackupGroups } from './create.js';
export type { CreateBackupOptions } from './create.js';
export {
  BACKUP_GROUP_IDS,
  BACKUP_GROUPS,
  isBackupGroupId,
  normalizeGroupIds,
  parseGroupIds,
  groupExistsAtHome,
  resolveGroupHomePath,
  estimateGroupBytes,
} from './groups.js';
export { inspectBackupZip, readManifestOnly } from './inspect.js';
export { applyRestore, destGroupHasData, groupsNeedingOverwrite } from './restore.js';
export type { ApplyRestoreOptions, ApplyRestoreResult } from './restore.js';
export { assertSafeZipEntryName, safeJoinZipTarget } from './security.js';
export {
  BackupError,
  type BackupGroupId,
  type BackupManifest,
  type InspectBackupResult,
} from './types.js';
