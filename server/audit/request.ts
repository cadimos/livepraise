import type { Request } from 'express';
import type { Database } from '../db/connection.js';
import { writeAuditLog, type AuditLogInput } from '../../core/audit/log.js';

export function clientIpFromRequest(req: Request): string | null {
  const ip = req.socket.remoteAddress?.trim();
  return ip || null;
}

export function auditFromRequest(
  db: Database,
  req: Request,
  input: Omit<AuditLogInput, 'ip' | 'userId' | 'username'> & {
    userId?: number | null;
    username?: string | null;
  },
): void {
  writeAuditLog(db, {
    ...input,
    userId: input.userId ?? req.auth?.user.id ?? null,
    username: input.username ?? req.auth?.user.username ?? null,
    ip: clientIpFromRequest(req),
  });
}
