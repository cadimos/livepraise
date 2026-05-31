import Fuse, { type IFuseOptions } from 'fuse.js';
import type { Song } from '../composables/useApi';

/** Texto agregado dos versos (campo `texto_versos` da API). */
export type SongWithLyrics = Song & { texto_versos?: string };

type WorshipFuseDoc = SongWithLyrics & { title: string; artist: string; lyrics: string };

const FUSE_OPTIONS: IFuseOptions<WorshipFuseDoc> = {
  keys: [
    { name: 'title', weight: 0.45 },
    { name: 'artist', weight: 0.25 },
    { name: 'lyrics', weight: 0.3 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
};

export function normalizeLyricsForSearch(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function songTitle(song: SongWithLyrics): string {
  return (song.nome2 ?? song.nome).trim();
}

function toFuseDoc(song: SongWithLyrics): WorshipFuseDoc {
  return {
    ...song,
    title: songTitle(song).toLowerCase(),
    artist: (song.artista ?? '').trim().toLowerCase(),
    lyrics: normalizeLyricsForSearch(song.texto_versos ?? ''),
  };
}

function stripFuseFields(doc: WorshipFuseDoc): SongWithLyrics {
  const { title: _t, artist: _a, lyrics: _l, ...song } = doc;
  return song;
}

export function createWorshipFuseIndex(songs: SongWithLyrics[]): Fuse<WorshipFuseDoc> {
  return new Fuse(songs.map(toFuseDoc), FUSE_OPTIONS);
}

/** Correspondência exata/parcial (substring) — rápida, sem Fuse. */
export function matchWorshipSongsLiteral(
  songs: SongWithLyrics[],
  query: string,
): SongWithLyrics[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return songs;

  const ranked: { song: SongWithLyrics; rank: number }[] = [];
  for (const song of songs) {
    const title = songTitle(song).toLowerCase();
    const artist = (song.artista ?? '').trim().toLowerCase();
    const lyrics = normalizeLyricsForSearch(song.texto_versos ?? '');

    let rank = -1;
    if (title === needle) rank = 0;
    else if (title.startsWith(needle)) rank = 1;
    else if (title.includes(needle)) rank = 2;
    else if (artist.includes(needle)) rank = 3;
    else if (lyrics.includes(needle)) rank = 4;

    if (rank >= 0) ranked.push({ song, rank });
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      songTitle(a.song).localeCompare(songTitle(b.song), undefined, { sensitivity: 'base' }),
  );
  return ranked.map((entry) => entry.song);
}

/**
 * Filtra músicas: correspondência literal primeiro; Fuse.js só se não houver hit literal.
 */
export function filterWorshipSongs(
  songs: SongWithLyrics[],
  query: string,
  fuse: Fuse<WorshipFuseDoc> | null,
): SongWithLyrics[] {
  const q = query.trim();
  if (!q) return songs;

  const literal = matchWorshipSongsLiteral(songs, q);
  if (literal.length > 0) return literal;

  if (!fuse || songs.length === 0) return [];
  return fuse.search(q).map((result) => stripFuseFields(result.item));
}
