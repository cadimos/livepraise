import {
  buildImportTabsFromExport,
  buildPlaylistExport,
  mapResolveBySongId,
  parsePlaylistExport,
  playlistExportHasContent,
  type PlaylistImportTab,
  type PlaylistResolveEntry,
} from '@shared/playlist-transfer';
import { expandVersesForDisplay, normalizeVerseText } from '@shared/verse-estofres';
import { fetchJson, type Verse } from './useApi';
import type { ChromeTab } from './usePreferences';

function normalizeVerses(
  items: Verse[],
  maxEstofreLines: number,
): { id: number; text: string }[] {
  const raw = (items ?? []).map((v) => ({
    id: v.id,
    text: normalizeVerseText(v.verso),
  }));
  return expandVersesForDisplay(raw, maxEstofreLines);
}

export function exportPlaylistFile(tabs: ChromeTab[]): void {
  if (!playlistExportHasContent(tabs)) return;
  const payload = buildPlaylistExport(tabs);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `livepraise-playlist-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importPlaylistFile(
  raw: string,
  missingMessage: string,
  maxEstofreLines: number,
): Promise<PlaylistImportTab[]> {
  const file = parsePlaylistExport(raw);
  const songIds = [
    ...new Set(
      file.items
        .map((i) => i.songId)
        .filter((id): id is number => id != null && id > 0),
    ),
  ];

  let resolved = new Map<number, PlaylistResolveEntry>();
  if (songIds.length) {
    const data = await fetchJson<{
      status: string;
      items: PlaylistResolveEntry[];
    }>('/playlist/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds }),
    });
    resolved = mapResolveBySongId(data.items ?? []);
  }

  const versesBySongId = new Map<number, { id: number; text: string }[]>();
  for (const id of songIds) {
    const hit = resolved.get(id);
    if (!hit?.exists) continue;
    const versesRes = await fetchJson<{ status: string; items: Verse[] }>(
      `/musica/verso/${id}`,
    );
    versesBySongId.set(id, normalizeVerses(versesRes.items ?? [], maxEstofreLines));
  }

  return buildImportTabsFromExport(
    file,
    resolved,
    versesBySongId,
    missingMessage,
  );
}
