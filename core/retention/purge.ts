import type { Database } from '../../server/db/connection.js';
import { purgeExpiredSessions } from '../auth/sessions.js';

/** Prazos de retenção (dias) — ver README / OpenAPI tag audit. */
export const RETENTION_DEACTIVATED_USER_DAYS = 30;
export const RETENTION_AUDIT_LOG_DAYS = 90;
export const RETENTION_INACTIVE_DEVICE_DAYS = 180;

export interface RetentionPurgeResult {
  expiredSessions: number;
  auditLogs: number;
  deactivatedUsers: number;
  inactiveDevices: number;
}

function countChanges(db: Database, sql: string, ...params: unknown[]): number {
  const result = db.prepare(sql).run(...params);
  return result.changes ?? 0;
}

/** Remove logs de auditoria mais antigos que o prazo configurado. */
export function purgeOldAuditLogs(
  db: Database,
  days = RETENTION_AUDIT_LOG_DAYS,
): number {
  return countChanges(
    db,
    `DELETE FROM audit_logs
     WHERE created_at < datetime('now', printf('-%d days', ?))`,
    days,
  );
}

/**
 * Remove contas desactivadas há mais de N dias.
 * Mantém pelo menos um utilizador `admin` activo na base.
 */
export function purgeDeactivatedUsers(
  db: Database,
  days = RETENTION_DEACTIVATED_USER_DAYS,
): number {
  const stale = db
    .prepare(
      `SELECT id, role FROM users
       WHERE active = 0
         AND updated_at < datetime('now', printf('-%d days', ?))`,
    )
    .all(days) as { id: number; role: string }[];

  let removed = 0;
  for (const user of stale) {
    if (user.role === 'admin') {
      const otherActiveAdmins = db
        .prepare(
          `SELECT COUNT(*) AS count FROM users
           WHERE role = 'admin' AND active = 1 AND id != ?`,
        )
        .get(user.id) as { count: number };
      if (otherActiveAdmins.count < 1) continue;
    }

    removed += countChanges(db, 'DELETE FROM users WHERE id = ?', user.id);
  }

  return removed;
}

/** Remove dispositivos externos sem actividade recente. */
export function purgeInactiveDevices(
  db: Database,
  days = RETENTION_INACTIVE_DEVICE_DAYS,
): number {
  return countChanges(
    db,
    `DELETE FROM external_devices
     WHERE last_seen_at < datetime('now', printf('-%d days', ?))`,
    days,
  );
}

/** Job diário: sessões expiradas + retenção de auditoria, contas e dispositivos. */
export function runRetentionPurge(db: Database): RetentionPurgeResult {
  return {
    expiredSessions: purgeExpiredSessions(db),
    auditLogs: purgeOldAuditLogs(db),
    deactivatedUsers: purgeDeactivatedUsers(db),
    inactiveDevices: purgeInactiveDevices(db),
  };
}
