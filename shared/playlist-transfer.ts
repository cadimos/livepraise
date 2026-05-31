/** Formato versionado de exportação/importação da playlist (chrome tabs). */

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
  verses: PlaylistExportVerse[];
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
  missing?: boolean;
  missingMessage?: string;
}

export function buildPlaylistExport(
  tabs: Array<{
    label: string;
    songId?: number;
    songName?: string;
    artist?: string;
    verses: PlaylistExportVerse[];
  }>,
): PlaylistExportFile {
  return {
    format: PLAYLIST_FORMAT,
    version: PLAYLIST_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    items: tabs.map((tab, index) => ({
      order: index,
      songId: tab.songId ?? null,
      label: tab.label,
      songName: tab.songName,
      artist: tab.artist,
      verses: tab.verses.map((v) => ({ id: v.id, text: v.text })),
    })),
  };
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
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      throw new Error('Item de playlist inválido.');
    }
    if (typeof item.label !== 'string' || !item.label.trim()) {
      throw new Error('Cada item precisa de um rótulo (label).');
    }
    if (!Array.isArray(item.verses)) {
      throw new Error(`Item "${item.label}": versos em falta.`);
    }
  }
  return {
    format: PLAYLIST_FORMAT,
    version: PLAYLIST_FORMAT_VERSION,
    exportedAt:
      typeof file.exportedAt === 'string' ? file.exportedAt : '',
    items: items as PlaylistExportItem[],
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

export function buildImportTabsFromExport(
  file: PlaylistExportFile,
  resolved: Map<number, PlaylistResolveEntry>,
  versesBySongId: Map<number, PlaylistImportTabVerse[]>,
  missingMessage: string,
): PlaylistImportTab[] {
  const sorted = [...file.items].sort((a, b) => a.order - b.order);
  return sorted.map((item) => {
    const songId = item.songId ?? undefined;
    if (songId == null) {
      return {
        label: item.label,
        verses: item.verses.map((v) => ({ id: v.id, text: v.text })),
      };
    }
    const hit = resolved.get(songId);
    if (hit?.exists) {
      const fresh = versesBySongId.get(songId);
      const label = hit.nome2 ?? hit.nome ?? item.label;
      return {
        label,
        songId,
        songName: hit.nome ?? item.songName,
        artist: hit.artista ?? item.artist,
        verses:
          fresh ??
          item.verses.map((v) => ({ id: v.id, text: v.text })),
      };
    }
    return {
      label: item.label,
      songId,
      songName: item.songName,
      artist: item.artist,
      verses: item.verses.map((v) => ({ id: v.id, text: v.text })),
      missing: true,
      missingMessage,
    };
  });
}
