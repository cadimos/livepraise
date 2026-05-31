/** Segmentos de path permitidos em ids de tema/locale (M11). */
export const SAFE_PATH_SEGMENT_RE = /^[a-zA-Z0-9_-]+$/;

export function isSafePathSegment(value: string): boolean {
  return typeof value === 'string' && value.length > 0 && SAFE_PATH_SEGMENT_RE.test(value);
}
