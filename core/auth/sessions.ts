import { randomBytes } from 'node:crypto';
import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';
import { findUserById } from './users.js';
import type { AuthContext, PublicUser, SessionRecord, UserRole } from './types.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function toPublicUserFromRow(row: {
  id: number;
  username: string;
  role: UserRole;
  active: number;
  created_at: string;
  updated_at: string;
}): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createToken(): string {
  return randomBytes(32).toString('hex');
}

export function createSession(
  db: Database,
  userId: number,
): AuthContext | null {
  const user = findUserById(db, userId);
  if (!user || user.active !== 1) return null;

  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const result = dbRun(
    db,
    'INSERT INTO auth_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
    [token, userId, expiresAt],
  );
  if (isDbError(result)) return null;

  return {
    token,
    user: toPublicUserFromRow(user),
  };
}

export function revokeSession(db: Database, token: string): void {
  dbRun(db, 'DELETE FROM auth_sessions WHERE token = ?', [token]);
}

export function revokeAllSessionsForUser(
  db: Database,
  userId: number,
): void {
  dbRun(db, 'DELETE FROM auth_sessions WHERE user_id = ?', [userId]);
}

export function resolveSession(
  db: Database,
  token: string,
): AuthContext | null {
  const rows = dbAll<
    SessionRecord & {
      id: number;
      username: string;
      role: UserRole;
      active: number;
      created_at: string;
      updated_at: string;
    }
  >(
    db,
    `SELECT s.token, s.user_id, s.expires_at, s.created_at,
            u.id, u.username, u.role, u.active, u.created_at, u.updated_at
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND u.active = 1
     LIMIT 1`,
    [token],
  );

  if (isDbError(rows) || !rows.length) return null;

  const row = rows[0]!;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    revokeSession(db, token);
    return null;
  }

  return {
    token: row.token,
    user: {
      id: row.id,
      username: row.username,
      role: row.role,
      active: row.active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

export function purgeExpiredSessions(db: Database): void {
  dbRun(db, "DELETE FROM auth_sessions WHERE expires_at < datetime('now')");
}
