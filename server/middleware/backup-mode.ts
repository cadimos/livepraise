import type { NextFunction, Request, Response } from 'express';
import { isBackupModeActive } from '../backup/backup-mode.js';
import { jsonError } from './common.js';

const ALLOWED_PREFIXES = [
  '/health',
  '/api/health',
  '/api/backup',
  '/api/restore',
];

function isAllowedDuringBackup(req: Request): boolean {
  const path = req.path;
  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Bloqueia escritas durante backup/restore (escopo §3.7). */
export function backupModeGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isBackupModeActive()) {
    next();
    return;
  }
  if (isAllowedDuringBackup(req)) {
    next();
    return;
  }
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  if (!mutating) {
    next();
    return;
  }
  jsonError(
    res,
    503,
    'Manutenção: backup ou restauro em curso. Tente novamente em instantes.',
    'backup_in_progress',
  );
}
