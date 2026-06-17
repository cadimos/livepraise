export interface BibleVerseLike {
  versiculo: number;
}

/** Índice do próximo versículo na lista (navegação por setas). */
export function computeNextVerseIndex(
  verses: BibleVerseLike[],
  selectedVerse: number | null,
  delta: number,
): number | null {
  if (!verses.length) return null;
  const currentIdx = verses.findIndex((v) => v.versiculo === selectedVerse);
  let nextIdx = currentIdx < 0 ? 0 : currentIdx + delta;
  nextIdx = Math.max(0, Math.min(verses.length - 1, nextIdx));
  if (nextIdx === currentIdx && currentIdx >= 0) return null;
  return nextIdx;
}
