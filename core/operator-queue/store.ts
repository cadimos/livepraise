import type { Database } from '../../server/db/connection.js';
import type {
  OperatorQueueState,
  OperatorQueueTab,
} from '../../shared/types/operator-queue.js';
import { sanitizeOperatorQueueTabs } from '../../shared/types/operator-queue.js';

interface OperatorQueueRow {
  enabled: number;
  revision: number;
  payload: string;
  updated_at: string | null;
  updated_by: string | null;
}

export type UpdateOperatorQueueResult =
  | { ok: true; state: OperatorQueueState }
  | { ok: false; reason: 'conflict'; state: OperatorQueueState };

function rowToState(row: OperatorQueueRow | undefined): OperatorQueueState {
  let tabs: OperatorQueueTab[] = [];
  try {
    tabs = sanitizeOperatorQueueTabs(JSON.parse(row?.payload ?? '[]')) ?? [];
  } catch {
    tabs = [];
  }
  return {
    enabled: row?.enabled === 1,
    revision: Number(row?.revision ?? 0),
    tabs,
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
  };
}

export function getOperatorQueueState(db: Database): OperatorQueueState {
  const row = db.prepare(
    `SELECT enabled, revision, payload, updated_at, updated_by
     FROM operator_queue_state WHERE id = 1`,
  ).get() as OperatorQueueRow | undefined;
  return rowToState(row);
}

export function updateOperatorQueueState(
  db: Database,
  input: {
    expectedRevision: number;
    enabled: boolean;
    tabs?: OperatorQueueTab[];
    updatedBy: string;
  },
): UpdateOperatorQueueResult {
  const current = getOperatorQueueState(db);
  if (current.revision !== input.expectedRevision) {
    return { ok: false, reason: 'conflict', state: current };
  }

  const tabs = input.tabs ?? current.tabs;
  const updatedAt = new Date().toISOString();
  const result = db.prepare(
    `UPDATE operator_queue_state
     SET enabled = ?, revision = revision + 1, payload = ?,
         updated_at = ?, updated_by = ?
     WHERE id = 1 AND revision = ?`,
  ).run(
    input.enabled ? 1 : 0,
    JSON.stringify(tabs),
    updatedAt,
    input.updatedBy,
    input.expectedRevision,
  );

  if (Number(result.changes) === 0) {
    return {
      ok: false,
      reason: 'conflict',
      state: getOperatorQueueState(db),
    };
  }
  return { ok: true, state: getOperatorQueueState(db) };
}
