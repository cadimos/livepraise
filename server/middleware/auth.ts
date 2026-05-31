import type { NextFunction, Request, Response } from 'express';
import { getMainDb } from '../db/connection.js';
import { resolveSession } from '../../core/auth/sessions.js';
import { isStaffRole } from '../../core/auth/roles.js';
import type { AuthContext, UserRole } from '../../core/auth/types.js';
import { isLocalSocket } from './client-ip.js';
import { jsonError } from './common.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = readBearerToken(req);
  if (!token) {
    next();
    return;
  }
  const auth = resolveSession(getMainDb(), token);
  if (auth) req.auth = auth;
  next();
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readBearerToken(req);
  if (!token) {
    jsonError(res, 401, 'Autenticação obrigatória');
    return;
  }
  const auth = resolveSession(getMainDb(), token);
  if (!auth) {
    jsonError(res, 401, 'Sessão inválida ou expirada');
    return;
  }
  req.auth = auth;
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      jsonError(res, 401, 'Autenticação obrigatória');
      return;
    }
    if (!roles.includes(req.auth.user.role)) {
      jsonError(res, 403, 'Permissão insuficiente');
      return;
    }
    next();
  };
}

/**
 * CA-R19 / M13 / CAD-119: consola local (Electron/127.0.0.1) sem token; LAN exige sessão
 * com papel `operator` ou `admin`.
 * Usado em `/api/users`, aprovações, chrome-tabs e error-log. Isenção baseada em
 * `socket.remoteAddress` (não `req.ip`/X-Forwarded-For) — ver `isLocalSocket`.
 */
export function requireOperatorAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const token = readBearerToken(req);
  if (token) {
    const auth = resolveSession(getMainDb(), token);
    if (auth?.user.active && isStaffRole(auth.user.role)) {
      req.auth = auth;
      next();
      return;
    }
  }
  if (isLocalSocket(req)) {
    next();
    return;
  }
  jsonError(res, 401, 'Autenticação de operador obrigatória');
}
