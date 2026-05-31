import { randomBytes } from 'node:crypto';
import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';
import { hashPassword } from './password.js';
import type { PublicUser, UserRecord, UserRole } from './types.js';

export interface BootstrapAdmin {
  username: string;
  password: string;
}

let lastBootstrapAdmin: BootstrapAdmin | null = null;

export function getLastBootstrapAdmin(): BootstrapAdmin | null {
  return lastBootstrapAdmin;
}

function generateBootstrapPassword(): string {
  const fromEnv = process.env.LIVEPRAISE_BOOTSTRAP_PASSWORD?.trim();
  if (fromEnv) return fromEnv;
  return randomBytes(16).toString('base64url');
}

function toPublicUser(row: UserRecord): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listUsers(db: Database): PublicUser[] {
  const rows = dbAll<UserRecord>(
    db,
    'SELECT * FROM users ORDER BY username COLLATE NOCASE ASC',
  );
  if (isDbError(rows)) return [];
  return rows.map(toPublicUser);
}

export function findUserByUsername(
  db: Database,
  username: string,
): UserRecord | null {
  const rows = dbAll<UserRecord>(
    db,
    'SELECT * FROM users WHERE username = ? COLLATE NOCASE LIMIT 1',
    [username],
  );
  if (isDbError(rows) || !rows.length) return null;
  return rows[0]!;
}

export function findUserById(
  db: Database,
  id: number,
): UserRecord | null {
  const rows = dbAll<UserRecord>(db, 'SELECT * FROM users WHERE id = ?', [id]);
  if (isDbError(rows) || !rows.length) return null;
  return rows[0]!;
}

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
}

export function createUser(
  db: Database,
  input: CreateUserInput,
): PublicUser | { error: string } {
  const existing = findUserByUsername(db, input.username);
  if (existing) return { error: 'Usuário já existe' };

  const now = new Date().toISOString();
  const id = dbRun(
    db,
    `INSERT INTO users (username, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
    [input.username, hashPassword(input.password), input.role, now, now],
  );
  if (isDbError(id)) return { error: String(id.mensagem) };

  const created = findUserById(db, Number(id));
  if (!created) return { error: 'Falha ao criar usuário' };
  return toPublicUser(created);
}

export interface UpdateUserInput {
  password?: string;
  role?: UserRole;
  active?: boolean;
}

export function updateUser(
  db: Database,
  id: number,
  input: UpdateUserInput,
): PublicUser | { error: string } {
  const current = findUserById(db, id);
  if (!current) return { error: 'Usuário não encontrado' };

  const fields: string[] = [];
  const params: unknown[] = [];

  if (input.password) {
    fields.push('password_hash = ?');
    params.push(hashPassword(input.password));
  }
  if (input.role) {
    fields.push('role = ?');
    params.push(input.role);
  }
  if (input.active !== undefined) {
    fields.push('active = ?');
    params.push(input.active ? 1 : 0);
  }

  if (!fields.length) return toPublicUser(current);

  const mustRevokeSessions =
    input.password !== undefined ||
    input.role !== undefined ||
    input.active !== undefined;

  fields.push("updated_at = datetime('now')");
  params.push(id);

  const result = dbRun(
    db,
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    params,
  );
  if (isDbError(result)) return { error: String(result.mensagem) };

  if (mustRevokeSessions) {
    dbRun(db, 'DELETE FROM auth_sessions WHERE user_id = ?', [id]);
  }

  const updated = findUserById(db, id);
  if (!updated) return { error: 'Falha ao actualizar usuário' };
  return toPublicUser(updated);
}

export function ensureDefaultAdmin(db: Database): BootstrapAdmin | null {
  const rows = dbAll<{ count: number }>(
    db,
    'SELECT COUNT(*) as count FROM users',
  );
  if (isDbError(rows) || rows[0]!.count > 0) return null;

  const password = generateBootstrapPassword();
  const created = createUser(db, {
    username: 'admin',
    password,
    role: 'admin',
  });
  if ('error' in created) return null;

  lastBootstrapAdmin = { username: 'admin', password };
  return lastBootstrapAdmin;
}
