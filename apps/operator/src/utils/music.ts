/** Utilitários de música — paridade v0.0.8 (salvar_musica / versos). */

export {
  clampMaxEstofreLines,
  DEFAULT_MAX_ESTOFRE_LINES,
  expandVersesForDisplay,
  normalizeVerseText,
  splitVerseTextForDisplay,
  splitVerseLinesForDisplay,
} from '@shared/verse-estofres';

export function splitLyricsIntoVerses(lyrics: string): string[] {
  const normalized = lyrics.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  return normalized
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Junta versos da API em letra editável (paridade v0.0.8 viewModalMusica). */
export function joinVersesIntoLyrics(verses: string[]): string {
  return verses
    .map((v) => v.replace(/<br \/>/gi, '\n').replace(/<br>/gi, '\n').trim())
    .filter(Boolean)
    .join('\n\n');
}
