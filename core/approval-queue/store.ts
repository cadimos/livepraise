import { randomUUID } from 'node:crypto';
import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';
import { sanitizeApprovalPayload } from './sanitize.js';

export type ApprovalKind = 'live-music' | 'live-bible' | 'live-video';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalItem {
  id: string;
  userId: number;
  userName: string;
  kind: ApprovalKind;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface ApprovalRow extends Record<string, unknown> {
  id: string;
  user_id: number;
  user_name: string;
  kind: ApprovalKind;
  payload: string;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

function mapRow(row: ApprovalRow): ApprovalItem {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    kind: row.kind,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
  };
}

export function enqueueApproval(
  db: Database,
  input: {
    userId: number;
    userName: string;
    kind: ApprovalKind;
    payload: Record<string, unknown>;
  },
): ApprovalItem | { error: string } {
  const id = randomUUID();
  const safePayload = sanitizeApprovalPayload(input.payload);
  const payloadJson = JSON.stringify(safePayload);
  const result = dbRun(
    db,
    `INSERT INTO approval_queue (id, user_id, user_name, kind, payload, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [id, input.userId, input.userName, input.kind, payloadJson],
  );
  if (isDbError(result)) return { error: String(result.mensagem) };

  const rows = dbAll<ApprovalRow>(
    db,
    'SELECT * FROM approval_queue WHERE id = ?',
    [id],
  );
  if (isDbError(rows) || !rows.length) return { error: 'Falha ao enfileirar' };
  return mapRow(rows[0]!);
}

export function listPendingApprovals(db: Database): ApprovalItem[] {
  const rows = dbAll<ApprovalRow>(
    db,
    "SELECT * FROM approval_queue WHERE status = 'pending' ORDER BY created_at ASC",
  );
  if (isDbError(rows)) return [];
  return rows.map(mapRow);
}

export function resolveApproval(
  db: Database,
  id: string,
  status: 'approved' | 'rejected',
  resolvedBy: string,
): ApprovalItem | { error: string } {
  const result = dbRun(
    db,
    `UPDATE approval_queue
     SET status = ?, resolved_at = datetime('now'), resolved_by = ?
     WHERE id = ? AND status = 'pending'`,
    [status, resolvedBy, id],
  );
  if (isDbError(result)) return { error: String(result.mensagem) };
  if (Number(result) === 0) return { error: 'Pedido não encontrado ou já resolvido' };

  const rows = dbAll<ApprovalRow>(
    db,
    'SELECT * FROM approval_queue WHERE id = ?',
    [id],
  );
  if (isDbError(rows) || !rows.length) return { error: 'Pedido não encontrado' };
  return mapRow(rows[0]!);
}

export function approvalToLiveAction(
  item: ApprovalItem,
): { acao: 'viewMusica' | 'viewBiblia' | 'video'; valor: string } | null {
  switch (item.kind) {
    case 'live-music':
      return {
        acao: 'viewMusica',
        valor: String(item.payload.html ?? ''),
      };
    case 'live-bible':
      return {
        acao: 'viewBiblia',
        valor: String(item.payload.html ?? ''),
      };
    case 'live-video':
      return {
        acao: 'video',
        valor: String(item.payload.url ?? ''),
      };
    default:
      return null;
  }
}
