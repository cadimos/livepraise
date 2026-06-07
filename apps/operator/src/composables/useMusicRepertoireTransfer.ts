import type { MusicRepertoireFile } from '@shared/music-repertoire';
import { fetchJson } from './useApi';

export async function exportMusicRepertoireFile(options: {
  categoryId?: string;
  songIds?: number[];
}): Promise<void> {
  const params = new URLSearchParams();
  if (options.categoryId) params.set('categoryId', options.categoryId);
  if (options.songIds?.length) params.set('songIds', options.songIds.join(','));
  const query = params.toString();
  const path = query ? `/musica/export?${query}` : '/musica/export';

  const data = await fetchJson<{ status: string; file: MusicRepertoireFile }>(path);
  const payload = data.file;
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `livepraise-repertorio-${stamp}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface MusicRepertoireImportResult {
  categoriesCreated: number;
  categoriesReused: number;
  songsImported: number;
  songsSkipped: number;
  versesImported: number;
}

export async function importMusicRepertoireFile(
  raw: string,
  idConflict: 'remap' | 'skip' | 'overwrite' = 'remap',
): Promise<MusicRepertoireImportResult> {
  const data = await fetchJson<{
    status: string;
    result: MusicRepertoireImportResult;
  }>(`/musica/import?idConflict=${idConflict}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw,
  });
  return data.result;
}
