import { Router, type Request, type Response } from 'express';
import {
  readDisplaysConfigFile,
  writeDisplaysConfigFile,
} from '../../core/displays/config-file.js';
import {
  canAssignDisplayRole,
  DISPLAY_ROLES_ALL,
} from '../../core/auth/roles.js';
import type { DisplaysConfig, DisplayRole } from '../../shared/types/live.js';
import { optionalAuth, requireOperatorAccess } from '../middleware/auth.js';
import { jsonError } from '../middleware/common.js';

const ROLES: DisplayRole[] = [...DISPLAY_ROLES_ALL];

export function createDisplaysConfigRouter(): Router {
  const api = Router();

  api.use(optionalAuth);

  api.get('/config', (_req: Request, res: Response) => {
    const config = readDisplaysConfigFile();
    res.json({ status: 'successo', config });
  });

  api.put('/config', requireOperatorAccess, (req: Request, res: Response) => {
    const body = req.body as DisplaysConfig;
    if (!body?.assignments || !Array.isArray(body.assignments)) {
      res.status(400).json({ status: 'erro', message: 'assignments obrigatório' });
      return;
    }

    for (const item of body.assignments) {
      if (!ROLES.includes(item.role)) {
        res.status(400).json({
          status: 'erro',
          message: `Papel inválido: ${item.role}`,
        });
        return;
      }
      if (
        req.auth &&
        !canAssignDisplayRole(req.auth.user.role, item.role)
      ) {
        jsonError(
          res,
          403,
          `Papel de conta "${req.auth.user.role}" não pode atribuir visualização "${item.role}"`,
        );
        return;
      }
    }

    const config: DisplaysConfig = {
      assignments: body.assignments,
      updatedAt: new Date().toISOString(),
    };
    writeDisplaysConfigFile(config);
    res.json({ status: 'successo', config });
  });

  return api;
}
