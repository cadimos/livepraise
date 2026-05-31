let backupModeActive = false;

export function isBackupModeActive(): boolean {
  return backupModeActive;
}

export function setBackupMode(active: boolean): void {
  backupModeActive = active;
}
