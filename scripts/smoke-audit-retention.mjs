#!/usr/bin/env node
/**
 * Smoke tarefa 1 — auditoria e retenção de dados.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const testHome = fs.mkdtempSync(path.join(os.tmpdir(), 'livepraise-audit-'));

process.env.LIVEPRAISE_HOME = testHome;
process.env.LIVEPRAISE_APP_ROOT = appRoot;
process.env.LIVEPRAISE_PORT = '0';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(id, note = '') {
  console.log(`PASS ${id}${note ? `: ${note}` : ''}`);
}

const { startLivepraiseServer, stopLivepraiseServer } = await import(
  '../dist/server/index.js'
);
const { getMainDb } = await import('../dist/server/db/connection.js');
const { runRetentionPurge } = await import('../dist/core/retention/purge.js');
const { hashPassword } = await import('../dist/core/auth/password.js');

const { port } = await startLivepraiseServer(0);
const base = `http://127.0.0.1:${port}`;
const db = getMainDb();

try {
  const createdRes = await fetch(`${base}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'audit_smoke_user',
      password: 'smoke-pass-1',
      role: 'remote',
    }),
  });
  assert(createdRes.status === 201, `POST /api/users → ${createdRes.status}`);
  const createdBody = await createdRes.json();
  const userId = createdBody.user?.id;
  assert(userId, 'utilizador criado com id');
  pass('A-1', 'criar utilizador via API');

  const auditRes = await fetch(`${base}/api/audit/logs?limit=20`);
  assert(auditRes.ok, `GET /api/audit/logs → ${auditRes.status}`);
  const auditBody = await auditRes.json();
  const createLog = (auditBody.logs ?? []).find(
    (entry) => entry.action === 'user.create' && entry.resource === `users/${userId}`,
  );
  assert(createLog, 'audit_logs deve conter user.create');
  assert(auditBody.retention?.auditLogDays === 90, 'política auditLogDays');
  assert(auditBody.retention?.deactivatedUserDays === 30, 'política deactivatedUserDays');
  pass('A-2', 'entrada em audit_logs após criar utilizador');

  const staleUsername = 'stale_deactivated_user';
  const now = new Date().toISOString();
  const oldDate = '2000-01-01T00:00:00.000Z';
  db.prepare(
    `INSERT INTO users (username, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, 'remote', 0, ?, ?)`,
  ).run(staleUsername, hashPassword('x'), oldDate, oldDate);

  const staleRow = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(staleUsername);
  assert(staleRow?.id, 'utilizador stale inserido');

  const purgeResult = runRetentionPurge(db);
  assert(purgeResult.deactivatedUsers >= 1, 'purge deve remover conta desactivada antiga');

  const afterStale = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(staleUsername);
  assert(!afterStale, 'conta stale deve ter sido removida');
  pass('A-3', `purge contas desactivadas (${purgeResult.deactivatedUsers})`);

  db.prepare(
    `INSERT INTO audit_logs (action, created_at) VALUES ('smoke.old', ?)`,
  ).run('1999-12-31T00:00:00.000Z');
  const purgeLogs = runRetentionPurge(db);
  const oldLog = db
    .prepare(`SELECT id FROM audit_logs WHERE action = 'smoke.old'`)
    .get();
  assert(!oldLog, 'log antigo deve ser removido');
  assert(purgeLogs.auditLogs >= 1, 'purge audit logs');
  pass('A-4', `purge audit_logs (${purgeLogs.auditLogs})`);
} finally {
  await stopLivepraiseServer();
}

console.log('smoke-audit-retention: OK');
