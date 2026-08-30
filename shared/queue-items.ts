/** Itens da fila de projeção (chrome tabs) e payload de drag-and-drop (CAD-189). */

import { moveListItem, moveListItemToInsertIndex } from './list-reorder.js';

export const QUEUE_DRAG_MIME = 'application/x-livepraise-queue-drag';

/**
 * Marcador presente apenas quando o arrasto reordena um item já na fila. Em
 * `dragover` o payload não é legível (modo protegido do DataTransfer), mas a lista
 * de tipos é — é por aqui que o destino distingue reordenar de adicionar.
 */
export const QUEUE_REORDER_MIME = 'application/x-livepraise-queue-reorder';

/** Reordenação das abas da playlist; distinto do MIME dos itens da fila. */
export const TAB_DRAG_MIME = 'application/x-livepraise-tab-drag';

export type QueueItemKind = 'music' | 'bible' | 'image' | 'video' | 'blank';

export interface QueueItem {
  id: string;
  kind: QueueItemKind;
  /** Texto curto no tile da fila. */
  label: string;
  text?: string;
  active?: boolean;
  /** ID do verso na BD (música). */
  verseId?: number;
  /** Música de origem (quando o verso veio do painel de louvor). */
  songId?: number;
  songName?: string;
  artist?: string;
  bibleFile?: string;
  bookId?: number;
  bookName?: string;
  chapter?: number;
  verseNum?: number;
  /** Caminho relativo em install/livepraise (imagens/vídeos). */
  mediaPath?: string;
  /** Miniatura JPEG do vídeo (`videos/{cat}/thumb/{nome}.jpg`). */
  thumbPath?: string;
  /** CAD-194: reprodução via embed quando download YouTube falhou. */
  youtubeVideoId?: string;
  /** Thumbnail YouTube enquanto o download local está em curso. */
  previewVideoId?: string;
  youtubeImportJobId?: string;
  youtubeImportPhase?: 'downloading' | 'processing' | 'failed';
  youtubeImportProgress?: number;
  youtubeImportAttempt?: number;
  youtubeImportMaxAttempts?: number;
  youtubeImportError?: string;
}

export interface QueueDragPayload {
  kind: QueueItemKind;
  label: string;
  text?: string;
  verseId?: number;
  songId?: number;
  songName?: string;
  artist?: string;
  bibleFile?: string;
  bookId?: number;
  bookName?: string;
  chapter?: number;
  verseNum?: number;
  mediaPath?: string;
  thumbPath?: string;
  youtubeVideoId?: string;
  /** Reordenar item existente na mesma fila. */
  sourceItemId?: string;
  sourceTabId?: string;
}

/** Paridade `server/routes/media.ts` / operador — thumb JPEG por vídeo. */
export function videoThumbRelativePath(videoRelativePath: string): string {
  const normalized = videoRelativePath.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts[0] !== 'videos' || parts.length < 2) return '';
  const cat = parts[1];
  const file = parts[parts.length - 1] ?? '';
  const base = file.replace(/\.[^.]+$/i, '');
  if (!base) return '';
  return `videos/${cat}/thumb/${base}.jpg`;
}

/** Caminho relativo para `<img>` no tile da fila (imagem ou thumb de vídeo). */
export function queueItemTileRelativePath(
  item: Pick<QueueItem, 'kind' | 'mediaPath' | 'thumbPath'>,
): string {
  if (item.kind === 'image') return item.mediaPath ?? '';
  if (item.kind === 'video') {
    if (item.thumbPath) return item.thumbPath;
    return videoThumbRelativePath(item.mediaPath ?? '');
  }
  return '';
}

export interface LegacyChromeTabVerse {
  id: number;
  text: string;
  active?: boolean;
}

let itemSeq = 0;

export function newQueueItemId(): string {
  itemSeq += 1;
  return `qi-${Date.now()}-${itemSeq}`;
}

export function migrateTabVerses(verses: LegacyChromeTabVerse[]): QueueItem[] {
  return verses.map((v) => ({
    id: `music-${v.id}`,
    kind: 'music' as const,
    label: summarizeLabel(v.text),
    text: v.text,
    verseId: v.id,
    active: v.active,
  }));
}

export function summarizeLabel(text: string, max = 48): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export function musicVersesForExport(
  items: QueueItem[],
): { id: number; text: string }[] {
  return items
    .filter((item) => item.kind === 'music' && item.text != null && item.verseId != null)
    .map((item) => ({ id: item.verseId!, text: item.text! }));
}

/** Payload serializável de um item da fila (sem id efémero). */
export type QueueItemExport = Omit<QueueItem, 'id' | 'active'>;

/** ID YouTube para thumb da fila e embed enquanto o download local não termina. */
export function youtubeQueueVideoId(
  item: Pick<QueueItem, 'previewVideoId' | 'youtubeVideoId'>,
): string | undefined {
  return item.previewVideoId ?? item.youtubeVideoId;
}

/** Vídeo YouTube sem ficheiro local — reprodução online. */
export function isYoutubeOnlinePlayback(item: QueueItem): boolean {
  return item.kind === 'video' && !item.mediaPath && Boolean(youtubeQueueVideoId(item));
}

export function queueItemsForExport(items: QueueItem[]): QueueItemExport[] {
  return items.map(
    ({
      id: _id,
      active: _active,
      youtubeImportJobId: _job,
      youtubeImportPhase: _phase,
      youtubeImportProgress: _progress,
      youtubeImportAttempt: _attempt,
      youtubeImportMaxAttempts: _max,
      youtubeImportError: _error,
      ...item
    }) => item,
  );
}

export function queueItemsFromExport(items: QueueItemExport[]): QueueItem[] {
  return items.map((item) => ({
    ...item,
    id: newQueueItemId(),
  }));
}

export function queueItemFromPayload(payload: QueueDragPayload): QueueItem {
  return {
    id: newQueueItemId(),
    kind: payload.kind,
    label: payload.label,
    text: payload.text,
    verseId: payload.verseId,
    songId: payload.songId,
    songName: payload.songName,
    artist: payload.artist,
    bibleFile: payload.bibleFile,
    bookId: payload.bookId,
    bookName: payload.bookName,
    chapter: payload.chapter,
    verseNum: payload.verseNum,
    mediaPath: payload.mediaPath,
    thumbPath: payload.thumbPath,
    youtubeVideoId: payload.youtubeVideoId,
  };
}

export function serializeQueueDragPayload(payload: QueueDragPayload): string {
  return JSON.stringify(payload);
}

export function parseQueueDragPayload(raw: string | null): QueueDragPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as QueueDragPayload;
    if (!data || typeof data !== 'object' || typeof data.kind !== 'string') return null;
    if (typeof data.label !== 'string' || !data.label.trim()) return null;
    return data;
  } catch {
    return null;
  }
}

/** Move um item para o índice final `toIndex` (posição após a remoção). */
export function reorderQueueItems(
  items: QueueItem[],
  fromIndex: number,
  toIndex: number,
): QueueItem[] {
  return moveListItem(items, fromIndex, toIndex);
}

/** Move um item para um índice de inserção (`items.length` = fim da fila). */
export function moveQueueItemToInsertIndex(
  items: QueueItem[],
  fromIndex: number,
  insertIndex: number,
): QueueItem[] {
  return moveListItemToInsertIndex(items, fromIndex, insertIndex);
}

export interface TabDragPayload {
  tabId: string;
}

export function serializeTabDragPayload(payload: TabDragPayload): string {
  return JSON.stringify(payload);
}

export function parseTabDragPayload(raw: string | null): TabDragPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as TabDragPayload;
    if (!data || typeof data !== 'object') return null;
    if (typeof data.tabId !== 'string' || !data.tabId) return null;
    return data;
  } catch {
    return null;
  }
}
