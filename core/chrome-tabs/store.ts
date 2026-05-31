import { randomUUID } from 'node:crypto';
import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';

export interface RemoteChromeTab {
  id: string;
  userId: number;
  userName: string;
  label: string;
  songId: number | null;
  songName: string | null;
  createdAt: string;
}

interface ChromeTabRow extends Record<string, unknown> {
  id: string;
  user_id: number;
  user_name: string;
  label: string;
  song_id: number | null;
  song_name: string | null;
  created_at: string;
  consumed: number;
}

function mapRow(row: ChromeTabRow): RemoteChromeTab {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    label: row.label,
    songId: row.song_id,
    songName: row.song_name,
    createdAt: row.created_at,
  };
}

export function addRemoteChromeTab(
  db: Database,
  input: {
    userId: number;
    userName: string;
    label: string;
    songId?: number;
    songName?: string;
  },
): RemoteChromeTab | { error: string } {
  const id = randomUUID();
  const result = dbRun(
    db,
    `INSERT INTO chrome_tabs_remote (id, user_id, user_name, label, song_id, song_name, consumed)
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      id,
      input.userId,
      input.userName,
      input.label,
      input.songId ?? null,
      input.songName ?? null,
    ],
  );
  if (isDbError(result)) return { error: String(result.mensagem) };

  const rows = dbAll<ChromeTabRow>(
    db,
    'SELECT * FROM chrome_tabs_remote WHERE id = ?',
    [id],
  );
  if (isDbError(rows) || !rows.length) return { error: 'Falha ao adicionar aba' };
  return mapRow(rows[0]!);
}

export function listUnconsumedChromeTabs(db: Database): RemoteChromeTab[] {
  const rows = dbAll<ChromeTabRow>(
    db,
    'SELECT * FROM chrome_tabs_remote WHERE consumed = 0 ORDER BY created_at ASC',
  );
  if (isDbError(rows)) return [];
  return rows.map(mapRow);
}

export function consumeChromeTab(
  db: Database,
  id: string,
): RemoteChromeTab | { error: string } {
  const result = dbRun(
    db,
    'UPDATE chrome_tabs_remote SET consumed = 1 WHERE id = ? AND consumed = 0',
    [id],
  );
  if (isDbError(result)) return { error: String(result.mensagem) };
  if (Number(result) === 0) return { error: 'Aba não encontrada' };

  const rows = dbAll<ChromeTabRow>(
    db,
    'SELECT * FROM chrome_tabs_remote WHERE id = ?',
    [id],
  );
  if (isDbError(rows) || !rows.length) return { error: 'Aba não encontrada' };
  return mapRow(rows[0]!);
}
