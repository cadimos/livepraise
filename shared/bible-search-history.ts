export const BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT = 5;
export const BIBLE_SEARCH_HISTORY_MIN_LIMIT = 1;
export const BIBLE_SEARCH_HISTORY_MAX_LIMIT = 20;

export function clampBibleSearchHistoryLimit(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return BIBLE_SEARCH_HISTORY_DEFAULT_LIMIT;
  return Math.min(
    BIBLE_SEARCH_HISTORY_MAX_LIMIT,
    Math.max(BIBLE_SEARCH_HISTORY_MIN_LIMIT, n),
  );
}

/** Últimas pesquisas (mais recente primeiro), sem duplicados case-insensitive. */
export function pushBibleSearchHistoryEntry(
  history: string[],
  query: string,
  limit: number,
): string[] {
  const trimmed = query.trim();
  if (!trimmed) return history;
  const capped = clampBibleSearchHistoryLimit(limit);
  const rest = history.filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
  return [trimmed, ...rest].slice(0, capped);
}

export function sanitizeBibleSearchHistory(
  history: unknown,
  limit: number,
): string[] {
  if (!Array.isArray(history)) return [];
  const capped = clampBibleSearchHistoryLimit(limit);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of history) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= capped) break;
  }
  return out;
}
