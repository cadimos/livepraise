import { Router, type Request, type Response } from 'express';
import { listAuditLogs } from '../../core/audit/log.js';
import {
  RETENTION_AUDIT_LOG_DAYS,
  RETENTION_DEACTIVATED_USER_DAYS,
  RETENTION_INACTIVE_DEVICE_DAYS,
} from '../../core/retention/purge.js';
import { getMainDb } from '../db/connection.js';
import { requireAdminAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

export function createAuditRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.use(requireAdminAccess);

  api.get('/logs', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const limitRaw = Number(req.query.limit ?? 100);
    const offsetRaw = Number(req.query.offset ?? 0);
    if (!Number.isFinite(limitRaw) || !Number.isFinite(offsetRaw)) {
      jsonError(res, 400, 'limit/offset inválidos');
      return;
    }

    res.json({
      status: 'Sucesso',
      retention: {
        deactivatedUserDays: RETENTION_DEACTIVATED_USER_DAYS,
        auditLogDays: RETENTION_AUDIT_LOG_DAYS,
        inactiveDeviceDays: RETENTION_INACTIVE_DEVICE_DAYS,
      },
      logs: listAuditLogs(db, limitRaw, offsetRaw),
    });
  });

  return api;
}
