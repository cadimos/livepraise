import { Router, type Request, type Response } from 'express';
import {
  createUser,
  listUsers,
  updateUser,
} from '../../core/auth/users.js';
import { isValidUserRole } from '../../core/auth/roles.js';
import type { UserRole } from '../../core/auth/types.js';
import { getMainDb } from '../db/connection.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

/**
 * Gestão de utilizadores (M13 / CAD-128).
 * Decisão: manter `requireOperatorAccess` — bypass só em socket loopback
 * (Electron local via 127.0.0.1); pedidos LAN exigem Bearer operator.
 * Risco residual: qualquer processo local pode chamar esta API sem token.
 */
export function createUsersRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.use(requireOperatorAccess);

  api.get('/', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    res.json({ status: 'Sucesso', users: listUsers(db) });
  });

  api.post('/', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const username = String(req.body.username ?? '').trim();
    const password = String(req.body.password ?? '');
    const role = String(req.body.role ?? 'remote') as UserRole;

    if (!username || !password) {
      jsonError(res, 400, 'Usuário e senha obrigatórios');
      return;
    }
    if (!isValidUserRole(role)) {
      jsonError(res, 400, 'Papel inválido');
      return;
    }

    const created = createUser(db, { username, password, role });
    if ('error' in created) {
      jsonError(res, 409, created.error);
      return;
    }
    res.status(201).json({ status: 'Sucesso', user: created });
  });

  api.patch('/:id', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      jsonError(res, 400, 'ID inválido');
      return;
    }

    const input: {
      password?: string;
      role?: UserRole;
      active?: boolean;
    } = {};

    if (req.body.password) input.password = String(req.body.password);
    if (req.body.role) {
      const role = String(req.body.role) as UserRole;
      if (!isValidUserRole(role)) {
        jsonError(res, 400, 'Papel inválido');
        return;
      }
      input.role = role;
    }
    if (req.body.active !== undefined) input.active = Boolean(req.body.active);

    const updated = updateUser(db, id, input);
    if ('error' in updated) {
      jsonError(res, 404, updated.error);
      return;
    }
    res.json({ status: 'Sucesso', user: updated });
  });

  return api;
}
