import type { QueueItem, QueueItemKind } from '../queue-items.js';

export type OperatorQueueItem = Omit<
  QueueItem,
  | 'active'
  | 'youtubeImportJobId'
  | 'youtubeImportPhase'
  | 'youtubeImportProgress'
  | 'youtubeImportAttempt'
  | 'youtubeImportMaxAttempts'
  | 'youtubeImportError'
>;

export interface OperatorQueueTab {
  id: string;
  label: string;
  songId?: number;
  songName?: string;
  artist?: string;
  missing?: boolean;
  missingMessage?: string;
  items: OperatorQueueItem[];
}

export interface OperatorQueueState {
  enabled: boolean;
  revision: number;
  tabs: OperatorQueueTab[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface OperatorQueueUpdate {
  expectedRevision: number;
  enabled: boolean;
  tabs?: OperatorQueueTab[];
}

export interface OperatorQueueSyncMessage {
  type: 'operator-queue-sync';
  state: OperatorQueueState;
  ts: number;
}

const KINDS = new Set<QueueItemKind>(['music', 'bible', 'image', 'video', 'blank']);
const MAX_TABS = 100;
const MAX_ITEMS = 2_000;
const MAX_SHORT_TEXT = 500;
const MAX_CONTENT_TEXT = 100_000;

function text(value: unknown, max: number, required = false): string | undefined {
  if (typeof value !== 'string') return required ? undefined : undefined;
  const normalized = value.slice(0, max);
  if (required && !normalized.trim()) return undefined;
  return normalized;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function sanitizeItem(value: unknown): OperatorQueueItem | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const id = text(raw.id, MAX_SHORT_TEXT, true);
  const label = text(raw.label, MAX_SHORT_TEXT, true);
  const kind = typeof raw.kind === 'string' && KINDS.has(raw.kind as QueueItemKind)
    ? raw.kind as QueueItemKind
    : null;
  if (!id || !label || !kind) return null;

  return {
    id,
    kind,
    label,
    text: text(raw.text, MAX_CONTENT_TEXT),
    verseId: number(raw.verseId),
    songId: number(raw.songId),
    songName: text(raw.songName, MAX_SHORT_TEXT),
    artist: text(raw.artist, MAX_SHORT_TEXT),
    bibleFile: text(raw.bibleFile, MAX_SHORT_TEXT),
    bookId: number(raw.bookId),
    bookName: text(raw.bookName, MAX_SHORT_TEXT),
    chapter: number(raw.chapter),
    verseNum: number(raw.verseNum),
    mediaPath: text(raw.mediaPath, MAX_CONTENT_TEXT),
    thumbPath: text(raw.thumbPath, MAX_CONTENT_TEXT),
    youtubeVideoId: text(raw.youtubeVideoId, MAX_SHORT_TEXT),
    previewVideoId: text(raw.previewVideoId, MAX_SHORT_TEXT),
  };
}

/** Valida e remove estado efémero/local antes de persistir ou transmitir a fila. */
export function sanitizeOperatorQueueTabs(value: unknown): OperatorQueueTab[] | null {
  if (!Array.isArray(value) || value.length > MAX_TABS) return null;
  let itemCount = 0;
  const tabs: OperatorQueueTab[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const raw = entry as Record<string, unknown>;
    const id = text(raw.id, MAX_SHORT_TEXT, true);
    const label = text(raw.label, MAX_SHORT_TEXT, true);
    if (!id || !label || !Array.isArray(raw.items)) return null;
    itemCount += raw.items.length;
    if (itemCount > MAX_ITEMS) return null;

    const items: OperatorQueueItem[] = [];
    for (const item of raw.items) {
      const sanitized = sanitizeItem(item);
      if (!sanitized) return null;
      items.push(sanitized);
    }
    tabs.push({
      id,
      label,
      songId: number(raw.songId),
      songName: text(raw.songName, MAX_SHORT_TEXT),
      artist: text(raw.artist, MAX_SHORT_TEXT),
      missing: typeof raw.missing === 'boolean' ? raw.missing : undefined,
      missingMessage: text(raw.missingMessage, MAX_CONTENT_TEXT),
      items,
    });
  }
  return tabs;
}
