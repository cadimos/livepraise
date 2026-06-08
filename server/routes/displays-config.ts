import { Router, type Request, type Response } from 'express';
import {
  readDisplaysConfigFile,
  writeDisplaysConfigFile,
} from '../../core/displays/config-file.js';
import {
  canAssignDisplayRole,
  DISPLAY_ROLES_ALL,
} from '../../core/auth/roles.js';
import { buildAjustarTelaPayload } from '../../shared/screen-layout.js';
import type {
  DisplayAssignment,
  DisplaysConfig,
  DisplayRole,
  LiveAction,
} from '../../shared/types/live.js';
import { optionalAuth, requireOperatorAccess } from '../middleware/auth.js';
import { jsonError } from '../middleware/common.js';
import type { LiveWebSocketHub } from '../websocket/live-hub.js';

const ROLES: DisplayRole[] = [...DISPLAY_ROLES_ALL];

function projectionScreenActions(config: DisplaysConfig): LiveAction[] {
  const actions: LiveAction[] = [];
  for (const assignment of config.assignments) {
    if (assignment.role !== 'projection') continue;
    if (assignment.connected === false) continue;
    const screen = assignment.screenSize;
    if (!screen) continue;
    actions.push({
      acao: 'ajustarTela',
      valor: buildAjustarTelaPayload(assignment.displayId, screen),
    });
  }
  return actions;
}

function applyProjectionScreens(
  liveHub: LiveWebSocketHub | undefined,
  config: DisplaysConfig,
): void {
  if (!liveHub) return;
  for (const action of projectionScreenActions(config)) {
    liveHub.applyOperatorAction(action, 'displays-config');
  }
  liveHub.broadcast({
    type: 'displays-config-updated',
    ts: Date.now(),
  });
}

export function createDisplaysConfigRouter(
  liveHub?: LiveWebSocketHub,
): Router {
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

    const previous = readDisplaysConfigFile();
    const previousById = new Map(
      (previous?.assignments ?? []).map((assignment) => [
        assignment.displayId,
        assignment,
      ]),
    );

    const config: DisplaysConfig = {
      assignments: body.assignments.map((item: DisplayAssignment) => {
        const stored = previousById.get(item.displayId);
        return {
          ...item,
          connected: stored?.connected ?? item.connected ?? true,
        };
      }),
      updatedAt: new Date().toISOString(),
    };
    writeDisplaysConfigFile(config);
    applyProjectionScreens(liveHub, config);
    res.json({ status: 'successo', config });
  });

  return api;
}
