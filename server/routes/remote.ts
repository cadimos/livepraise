import { Router, type Request, type Response } from 'express';
import {
  approvalToLiveAction,
  enqueueApproval,
  listPendingApprovals,
  resolveApproval,
} from '../../core/approval-queue/store.js';
import {
  addRemoteChromeTab,
  consumeChromeTab,
  listUnconsumedChromeTabs,
} from '../../core/chrome-tabs/store.js';
import type { LiveWebSocketHub } from '../websocket/index.js';
import { getMainDb } from '../db/connection.js';
import { requireAuth, requireOperatorAccess, requireRole } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

export function createRemoteRouter(liveHub: LiveWebSocketHub): Router {
  const api = Router();
  const db = getMainDb();

  api.post(
    '/chrome-tab',
    requireAuth,
    requireRole('remote'),
    (req: Request, res: Response) => {
      allowCors(req, res, () => {});
      const label = String(req.body.label ?? '').trim();
      if (!label) {
        jsonError(res, 400, 'Label obrigatório');
        return;
      }

      const tab = addRemoteChromeTab(db, {
        userId: req.auth!.user.id,
        userName: req.auth!.user.username,
        label,
        songId: req.body.songId ? Number(req.body.songId) : undefined,
        songName: req.body.songName ? String(req.body.songName) : undefined,
      });

      if ('error' in tab) {
        jsonError(res, 500, tab.error);
        return;
      }

      liveHub.broadcast({
        type: 'chrome-tab-added',
        tab: {
          id: tab.id,
          label: tab.label,
          songId: tab.songId,
          songName: tab.songName,
          from: tab.userName,
        },
      });

      res.status(201).json({ status: 'Sucesso', tab });
    },
  );

  api.post(
    '/live-request',
    requireAuth,
    requireRole('remote'),
    (req: Request, res: Response) => {
      allowCors(req, res, () => {});
      const kind = String(req.body.kind ?? '');
      if (
        kind !== 'live-music' &&
        kind !== 'live-bible' &&
        kind !== 'live-video'
      ) {
        jsonError(res, 400, 'Tipo de pedido inválido');
        return;
      }

      const payload = req.body.payload;
      if (!payload || typeof payload !== 'object') {
        jsonError(res, 400, 'Payload obrigatório');
        return;
      }

      const item = enqueueApproval(db, {
        userId: req.auth!.user.id,
        userName: req.auth!.user.username,
        kind,
        payload: payload as Record<string, unknown>,
      });

      if ('error' in item) {
        jsonError(res, 500, item.error);
        return;
      }

      liveHub.broadcast({
        type: 'approval-pending',
        item: {
          id: item.id,
          kind: item.kind,
          userName: item.userName,
          payload: item.payload,
          createdAt: item.createdAt,
        },
      });

      res.status(202).json({ status: 'Sucesso', approval: item });
    },
  );

  api.get('/chrome-tabs', requireOperatorAccess, (_req: Request, res: Response) => {
    res.json({
      status: 'Sucesso',
      tabs: listUnconsumedChromeTabs(db),
    });
  });

  api.post('/chrome-tabs/:id/consume', requireOperatorAccess, (req: Request, res: Response) => {
    const result = consumeChromeTab(db, String(req.params.id));
    if ('error' in result) {
      jsonError(res, 404, result.error);
      return;
    }
    res.json({ status: 'Sucesso', tab: result });
  });

  api.get('/approvals/pending', requireOperatorAccess, (_req: Request, res: Response) => {
    res.json({
      status: 'Sucesso',
      items: listPendingApprovals(db),
    });
  });

  api.post('/approvals/:id/approve', requireOperatorAccess, (req: Request, res: Response) => {
    const pending = listPendingApprovals(db).find((i) => i.id === String(req.params.id));
    if (!pending) {
      jsonError(res, 404, 'Pedido não encontrado');
      return;
    }

    const actor = req.auth?.user.username ?? 'operador-local';
    const resolved = resolveApproval(db, String(req.params.id), 'approved', actor);
    if ('error' in resolved) {
      jsonError(res, 404, resolved.error);
      return;
    }

    const liveAction = approvalToLiveAction(resolved);
    if (liveAction) {
      liveHub.applyOperatorAction(liveAction, actor);
    }

    liveHub.broadcast({
      type: 'approval-resolved',
      id: resolved.id,
      status: resolved.status,
    });

    res.json({ status: 'Sucesso', approval: resolved, liveAction });
  });

  api.post('/approvals/:id/reject', requireOperatorAccess, (req: Request, res: Response) => {
    const actor = req.auth?.user.username ?? 'operador-local';
    const resolved = resolveApproval(db, String(req.params.id), 'rejected', actor);
    if ('error' in resolved) {
      jsonError(res, 404, resolved.error);
      return;
    }

    liveHub.broadcast({
      type: 'approval-resolved',
      id: resolved.id,
      status: resolved.status,
    });

    res.json({ status: 'Sucesso', approval: resolved });
  });

  return api;
}
