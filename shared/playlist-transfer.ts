/** Formato versionado de exportação/importação da playlist (chrome tabs). */

import {
  migrateTabVerses,
  musicVersesForExport,
  queueItemsFromExport,
  queueItemsForExport,
  type QueueItem,
  type QueueItemExport,
  type QueueItemKind,
} from './queue-items.js';

export const PLAYLIST_FORMAT = 'livepraise-playlist' as const;
export const PLAYLIST_FORMAT_VERSION = 1 as const;

export interface PlaylistExportVerse {
  id: number;
  text: string;
}

export interface PlaylistExportItem {
  order: number;
  songId: number | null;
  label: string;
  songName?: string;
  artist?: string;
  /** Legado — versos de música; mantido para compatibilidade. */
  verses: PlaylistExportVerse[];
  /** Fila completa (música, bíblia, imagem, vídeo, YouTube, etc.). */
  queueItems?: QueueItemExport[];
}

export interface PlaylistExportFile {
  format: typeof PLAYLIST_FORMAT;
  version: typeof PLAYLIST_FORMAT_VERSION;
  exportedAt: string;
  items: PlaylistExportItem[];
}

export interface PlaylistResolveEntry {
  id: number;
  exists: boolean;
  nome?: string;
  nome2?: string;
  artista?: string;
}

export interface PlaylistImportTabVerse {
  id: number;
  text: string;
}

export interface PlaylistImportTab {
  label: string;
  songId?: number;
  songName?: string;
  artist?: string;
  verses: PlaylistImportTabVerse[];
  items?: QueueItem[];
  missing?: boolean;
  missingMessage?: string;
}

function tabQueueItems(
  tab: {
    verses?: PlaylistExportVerse[];
    items?: QueueItem[];
  },
): QueueItem[] {
  if (tab.items?.length) return tab.items;
  if (tab.verses?.length) return migrateTabVerses(tab.verses);
  return [];
}

function parseQueueItemExport(raw: unknown): QueueItemExport | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const kind = item.kind;
  if (
    kind !== 'music' &&
    kind !== 'bible' &&
    kind !== 'image' &&
    kind !== 'video' &&
    kind !== 'blank'
  ) {
    return null;
  }
  if (typeof item.label !== 'string' || !item.label.trim()) return null;

  const parsed: QueueItemExport = {
    kind: kind as QueueItemKind,
    label: item.label.trim(),
  };

  if (typeof item.text === 'string') parsed.text = item.text;
  if (typeof item.verseId === 'number' && Number.isFinite(item.verseId)) {
    parsed.verseId = item.verseId;
  }
  if (typeof item.songId === 'number' && Number.isFinite(item.songId)) {
    parsed.songId = item.songId;
  }
  if (typeof item.songName === 'string') parsed.songName = item.songName;
  if (typeof item.artist === 'string') parsed.artist = item.artist;
  if (typeof item.bibleFile === 'string') parsed.bibleFile = item.bibleFile;
  if (typeof item.bookId === 'number' && Number.isFinite(item.bookId)) {
    parsed.bookId = item.bookId;
  }
  if (typeof item.bookName === 'string') parsed.bookName = item.bookName;
  if (typeof item.chapter === 'number' && Number.isFinite(item.chapter)) {
    parsed.chapter = item.chapter;
  }
  if (typeof item.verseNum === 'number' && Number.isFinite(item.verseNum)) {
    parsed.verseNum = item.verseNum;
  }
  if (typeof item.mediaPath === 'string') parsed.mediaPath = item.mediaPath;
  if (typeof item.thumbPath === 'string') parsed.thumbPath = item.thumbPath;
  if (typeof item.youtubeVideoId === 'string') {
    parsed.youtubeVideoId = item.youtubeVideoId;
  }

  return parsed;
}

export function buildPlaylistExport(
  tabs: Array<{
    label: string;
    songId?: number;
    songName?: string;
    artist?: string;
    verses?: PlaylistExportVerse[];
    items?: QueueItem[];
  }>,
): PlaylistExportFile {
  const items = tabs
    .map((tab, index) => {
      const queue = tabQueueItems(tab);
      const verses =
        tab.verses?.map((v) => ({ id: v.id, text: v.text })) ??
        musicVersesForExport(queue);
      return {
        order: index,
        songId: tab.songId ?? null,
        label: tab.label,
        songName: tab.songName,
        artist: tab.artist,
        verses,
        queueItems: queueItemsForExport(queue),
      };
    })
    .filter((entry) => entry.verses.length > 0 || entry.queueItems.length > 0);

  return {
    format: PLAYLIST_FORMAT,
    version: PLAYLIST_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    items,
  };
}

export function playlistExportHasContent(
  tabs: Parameters<typeof buildPlaylistExport>[0],
): boolean {
  return tabs.some((tab) => tabQueueItems(tab).length > 0);
}

export function parsePlaylistExport(raw: string): PlaylistExportFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Ficheiro JSON inválido.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Formato de playlist inválido.');
  }
  const file = data as Partial<PlaylistExportFile>;
  if (file.format !== PLAYLIST_FORMAT) {
    throw new Error(
      `Formato não reconhecido (esperado "${PLAYLIST_FORMAT}").`,
    );
  }
  if (file.version !== PLAYLIST_FORMAT_VERSION) {
    throw new Error(
      `Versão não suportada (esperado ${PLAYLIST_FORMAT_VERSION}, recebido ${String(file.version)}).`,
    );
  }
  if (!Array.isArray(file.items) || !file.items.length) {
    throw new Error('Playlist vazia ou sem itens.');
  }
  const items = [...file.items].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const normalized: PlaylistExportItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Item de playlist inválido.');
    }
    if (typeof item.label !== 'string' || !item.label.trim()) {
      throw new Error('Cada item precisa de um rótulo (label).');
    }

    const verses = Array.isArray(item.verses)
      ? item.verses.map((v) => ({
          id: Number(v.id),
          text: String(v.text ?? ''),
        }))
      : [];

    let queueItems: QueueItemExport[] | undefined;
    if (Array.isArray(item.queueItems)) {
      queueItems = [];
      for (const rawItem of item.queueItems) {
        const parsed = parseQueueItemExport(rawItem);
        if (!parsed) {
          throw new Error(`Item "${item.label}": entrada de fila inválida.`);
        }
        queueItems.push(parsed);
      }
    }

    if (!verses.length && !queueItems?.length) {
      throw new Error(`Item "${item.label}": fila vazia.`);
    }

    normalized.push({
      order: item.order ?? normalized.length,
      songId: item.songId ?? null,
      label: item.label.trim(),
      songName: item.songName,
      artist: item.artist,
      verses,
      queueItems,
    });
  }
  return {
    format: PLAYLIST_FORMAT,
    version: PLAYLIST_FORMAT_VERSION,
    exportedAt:
      typeof file.exportedAt === 'string' ? file.exportedAt : '',
    items: normalized,
  };
}

export function mapResolveBySongId(
  entries: PlaylistResolveEntry[],
): Map<number, PlaylistResolveEntry> {
  const map = new Map<number, PlaylistResolveEntry>();
  for (const entry of entries) {
    map.set(entry.id, entry);
  }
  return map;
}

function importTabBase(
  item: PlaylistExportItem,
  extra: Partial<PlaylistImportTab> = {},
): PlaylistImportTab {
  const verses = item.verses.map((v) => ({ id: v.id, text: v.text }));
  const items = item.queueItems?.length
    ? queueItemsFromExport(item.queueItems)
    : undefined;
  return {
    label: item.label,
    verses,
    items,
    ...extra,
  };
}

export function buildImportTabsFromExport(
  file: PlaylistExportFile,
  resolved: Map<number, PlaylistResolveEntry>,
  versesBySongId: Map<number, PlaylistImportTabVerse[]>,
  missingMessage: string,
): PlaylistImportTab[] {
  const sorted = [...file.items].sort((a, b) => a.order - b.order);
  return sorted.map((item) => {
    const songId = item.songId ?? undefined;

    if (item.queueItems?.length) {
      if (songId == null) {
        return importTabBase(item);
      }
      const hit = resolved.get(songId);
      if (hit?.exists) {
        const label = hit.nome2 ?? hit.nome ?? item.label;
        return importTabBase(item, {
          label,
          songId,
          songName: hit.nome ?? item.songName,
          artist: hit.artista ?? item.artist,
          verses:
            versesBySongId.get(songId) ??
            item.verses.map((v) => ({ id: v.id, text: v.text })),
        });
      }
      return importTabBase(item, {
        songId,
        songName: item.songName,
        artist: item.artist,
        missing: true,
        missingMessage,
      });
    }

    if (songId == null) {
      return importTabBase(item);
    }
    const hit = resolved.get(songId);
    if (hit?.exists) {
      const fresh = versesBySongId.get(songId);
      const label = hit.nome2 ?? hit.nome ?? item.label;
      return importTabBase(item, {
        label,
        songId,
        songName: hit.nome ?? item.songName,
        artist: hit.artista ?? item.artist,
        verses:
          fresh ??
          item.verses.map((v) => ({ id: v.id, text: v.text })),
      });
    }
    return importTabBase(item, {
      songId,
      songName: item.songName,
      artist: item.artist,
      missing: true,
      missingMessage,
    });
  });
}
