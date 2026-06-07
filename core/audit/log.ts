import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'user.create'
  | 'user.update'
  | 'device.register'
  | 'device.update'
  | 'backup.export'
  | 'backup.restore';

export interface AuditLogInput {
  userId?: number | null;
  username?: string | null;
  action: AuditAction;
  resource?: string | null;
  ip?: string | null;
  details?: Record<string, unknown> | null;
}

export interface AuditLogRecord {
  id: number;
  userId: number | null;
  username: string | null;
  action: AuditAction;
  resource: string | null;
  ip: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface AuditLogRow extends Record<string, unknown> {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  ip: string | null;
  details: string | null;
  created_at: string;
}

function parseDetails(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function rowToRecord(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    action: row.action as AuditAction,
    resource: row.resource,
    ip: row.ip,
    details: parseDetails(row.details),
    createdAt: row.created_at,
  };
}

export function writeAuditLog(db: Database, input: AuditLogInput): void {
  const details =
    input.details && Object.keys(input.details).length > 0
      ? JSON.stringify(input.details)
      : null;

  dbRun(
    db,
    `INSERT INTO audit_logs (user_id, username, action, resource, ip, details)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.userId ?? null,
      input.username ?? null,
      input.action,
      input.resource ?? null,
      input.ip ?? null,
      details,
    ],
  );
}

export function listAuditLogs(
  db: Database,
  limit = 100,
  offset = 0,
): AuditLogRecord[] {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 500);
  const safeOffset = Math.max(0, Math.floor(offset));

  const rows = dbAll<AuditLogRow>(
    db,
    `SELECT id, user_id, username, action, resource, ip, details, created_at
     FROM audit_logs
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [safeLimit, safeOffset],
  );

  if (isDbError(rows)) return [];
  return rows.map(rowToRecord);
}
