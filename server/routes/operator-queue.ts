import { Router, type Request, type Response } from 'express';
import {
  getOperatorQueueState,
  updateOperatorQueueState,
} from '../../core/operator-queue/store.js';
import { sanitizeOperatorQueueTabs } from '../../shared/types/operator-queue.js';
import { getMainDb } from '../db/connection.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { jsonError } from '../middleware/common.js';
import type { LiveWebSocketHub } from '../websocket/index.js';

export function createOperatorQueueRouter(liveHub?: LiveWebSocketHub): Router {
  const router = Router();

  router.get('/', requireOperatorAccess, (_req: Request, res: Response) => {
    res.json({ status: 'ok', state: getOperatorQueueState(getMainDb()) });
  });

  router.put('/', requireOperatorAccess, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const expectedRevision = Number(body.expectedRevision);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) {
      jsonError(res, 400, 'Revisão da fila inválida');
      return;
    }
    if (typeof body.enabled !== 'boolean') {
      jsonError(res, 400, 'Estado de sincronização inválido');
      return;
    }

    let tabs;
    if (body.tabs !== undefined) {
      tabs = sanitizeOperatorQueueTabs(body.tabs);
      if (!tabs) {
        jsonError(res, 400, 'Fila inválida ou acima do limite permitido');
        return;
      }
    } else if (body.enabled) {
      jsonError(res, 400, 'A fila é obrigatória ao habilitar a sincronização');
      return;
    }

    const result = updateOperatorQueueState(getMainDb(), {
      expectedRevision,
      enabled: body.enabled,
      tabs: tabs ?? undefined,
      updatedBy: req.auth?.user.username ?? 'operador-local',
    });
    if (!result.ok) {
      res.status(409).json({
        status: 'conflict',
        error: 'A fila foi alterada por outro operador',
        state: result.state,
      });
      return;
    }

    liveHub?.broadcastOperatorQueue(result.state);
    res.json({ status: 'ok', state: result.state });
  });

  return router;
}
