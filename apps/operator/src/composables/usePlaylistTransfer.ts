import {
  buildImportTabsFromExport,
  buildPlaylistExport,
  mapResolveBySongId,
  parsePlaylistExport,
  type PlaylistImportTab,
  type PlaylistResolveEntry,
} from '@shared/playlist-transfer';
import { fetchJson, type Verse } from './useApi';
import type { ChromeTab } from './usePreferences';

function normalizeVerses(items: Verse[]): { id: number; text: string }[] {
  return (items ?? []).map((v) => ({
    id: v.id,
    text: v.verso.replace(/<br \/>/g, '\n'),
  }));
}

export function exportPlaylistFile(tabs: ChromeTab[]): void {
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
    versesBySongId.set(id, normalizeVerses(versesRes.items ?? []));
  }

  return buildImportTabsFromExport(
    file,
    resolved,
    versesBySongId,
    missingMessage,
  );
}
