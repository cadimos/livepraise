import { Router, type Request, type Response } from 'express';
import { verifyPassword } from '../../core/auth/password.js';
import { findUserByUsername } from '../../core/auth/users.js';
import {
  createSession,
  purgeExpiredSessions,
  resolveSession,
  revokeSession,
} from '../../core/auth/sessions.js';
import { getMainDb } from '../db/connection.js';
import { allowedDisplayRolesForUser } from '../../core/auth/roles.js';
import { requireAuth } from '../middleware/auth.js';
import { consumeRateLimit } from '../middleware/rate-limit.js';
import { allowCors, jsonError } from '../middleware/common.js';
import { auditFromRequest, clientIpFromRequest } from '../audit/request.js';
import { writeAuditLog } from '../../core/audit/log.js';

export function createAuthRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.post('/login', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    purgeExpiredSessions(db);

    const rateKey = `login:${req.socket.remoteAddress ?? 'unknown'}`;
    if (!consumeRateLimit(rateKey, 20, 60_000)) {
      jsonError(res, 429, 'Demasiadas tentativas de login');
      return;
    }

    const body = (req.body ?? {}) as { username?: unknown; password?: unknown };
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');
    if (!username || !password) {
      jsonError(res, 400, 'Usuário e senha obrigatórios');
      return;
    }

    const user = findUserByUsername(db, username);
    if (!user || user.active !== 1 || !verifyPassword(password, user.password_hash)) {
      writeAuditLog(db, {
        username,
        action: 'auth.login_failed',
        resource: `users/${username}`,
        ip: clientIpFromRequest(req),
      });
      jsonError(res, 401, 'Credenciais inválidas');
      return;
    }

    const session = createSession(db, user.id);
    if (!session) {
      jsonError(res, 500, 'Falha ao criar sessão');
      return;
    }

    auditFromRequest(db, req, {
      userId: user.id,
      username: user.username,
      action: 'auth.login',
      resource: `users/${user.id}`,
    });

    res.json({
      status: 'Sucesso',
      token: session.token,
      user: session.user,
      displayRoles: allowedDisplayRolesForUser(session.user.role),
    });
  });

  api.post('/logout', requireAuth, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    if (req.auth) {
      auditFromRequest(db, req, {
        action: 'auth.logout',
        resource: `users/${req.auth.user.id}`,
      });
      revokeSession(db, req.auth.token);
    }
    res.json({ status: 'Sucesso' });
  });

  api.get('/me', requireAuth, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    res.json({
      status: 'Sucesso',
      user: req.auth!.user,
      displayRoles: allowedDisplayRolesForUser(req.auth!.user.role),
    });
  });

  api.get('/session', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ')
      ? header.slice('Bearer '.length).trim()
      : null;
    if (!token) {
      jsonError(res, 401, 'Token ausente');
      return;
    }
    const auth = resolveSession(db, token);
    if (!auth) {
      jsonError(res, 401, 'Sessão inválida');
      return;
    }
    res.json({
      status: 'Sucesso',
      user: auth.user,
      displayRoles: allowedDisplayRolesForUser(auth.user.role),
    });
  });

  return api;
}
