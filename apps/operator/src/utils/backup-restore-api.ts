import { readAuthToken } from '@shared/auth-session';
import { apiBase } from '../composables/useApi';

export type BackupGroupId =
  | 'database'
  | 'media_images'
  | 'media_videos'
  | 'themes'
  | 'locales'
  | 'displays'
  | 'projection_state'
  | 'biblias'
  | 'error_log'
  | 'operator_ui';

export type BackupApiErrorCode =
  | 'invalid_groups'
  | 'disk_full'
  | 'permission_denied'
  | 'invalid_zip'
  | 'migration_newer'
  | 'confirm_required'
  | 'restore_failed'
  | 'backup_in_progress'
  | 'failed';

export class BackupApiError extends Error {
  constructor(
    message: string,
    readonly code: BackupApiErrorCode,
  ) {
    super(message);
    this.name = 'BackupApiError';
  }
}

function authHeaders(): HeadersInit {
  const token = readAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response): Promise<BackupApiError> {
  try {
    const body = (await res.json()) as { error?: string; code?: string };
    const code = (body.code ?? 'failed') as BackupApiErrorCode;
    return new BackupApiError(body.error ?? `HTTP ${res.status}`, code);
  } catch {
    return new BackupApiError(`HTTP ${res.status}`, 'failed');
  }
}

export interface OperatorUiFilePayload {
  name: string;
  content: string;
}

export async function postBackupCreate(
  groups: BackupGroupId[],
  operatorUiFiles: OperatorUiFilePayload[],
): Promise<Blob> {
  const res = await fetch(`${apiBase()}/api/backup/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ groups, operatorUiFiles }),
  });
  if (!res.ok) throw await parseError(res);
  return res.blob();
}

export interface InspectBackupResponse {
  manifest: {
    createdAt: string;
    appVersion: string;
    groups: BackupGroupId[];
  };
  presentGroups: BackupGroupId[];
  absentGroups: BackupGroupId[];
  allGroups: string[];
  tempZipPath: string;
}

export async function postRestoreInspect(file: File): Promise<InspectBackupResponse> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${apiBase()}/api/restore/inspect`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<InspectBackupResponse>;
}

export async function postRestoreOverwriteCheck(
  groups: BackupGroupId[],
): Promise<BackupGroupId[]> {
  const res = await fetch(`${apiBase()}/api/restore/overwrite-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ groups }),
  });
  if (!res.ok) throw await parseError(res);
  const body = (await res.json()) as { groups: BackupGroupId[] };
  return body.groups;
}

export interface ApplyRestoreResponse {
  appliedGroups: BackupGroupId[];
  databaseRestored: boolean;
  operatorUiFiles: OperatorUiFilePayload[];
  needsRelogin: boolean;
}

export async function postRestoreApply(
  zipPath: string,
  groups: BackupGroupId[],
  confirmOverwrite: boolean,
): Promise<ApplyRestoreResponse> {
  const res = await fetch(`${apiBase()}/api/restore/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ zipPath, groups, confirmOverwrite }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<ApplyRestoreResponse>;
}
