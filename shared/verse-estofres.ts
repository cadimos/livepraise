/**
 * Divide linhas de um verso para exibição/fila (CAD-182).
 * Não altera o que é guardado na BD — só a apresentação no operador.
 */

/** Máximo de linhas por estofre (bloco de projeção) — padrão CAD-182. */
export const DEFAULT_MAX_ESTOFRE_LINES = 4;

const MIN_MAX_ESTOFRE_LINES = 2;
const MAX_MAX_ESTOFRE_LINES = 12;

export function clampMaxEstofreLines(value: number): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_MAX_ESTOFRE_LINES;
  return Math.min(MAX_MAX_ESTOFRE_LINES, Math.max(MIN_MAX_ESTOFRE_LINES, n));
}

/** Normaliza letra vinda da BD (`<br />`, `<br>`, `\n`). */
export function normalizeVerseText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/gi, ' ');
}

/** Divide linhas; evita deixar uma única linha “órfã” no último bloco. */
export function splitVerseLinesForDisplay(
  lines: string[],
  maxLinesPerEstofre: number,
): string[][] {
  const max = clampMaxEstofreLines(maxLinesPerEstofre);
  const n = lines.length;
  if (n === 0) return [];

  const chunks: string[][] = [];
  let i = 0;
  while (i < n) {
    const remaining = n - i;
    if (remaining <= max) {
      chunks.push(lines.slice(i));
      break;
    }
    const tailAfterMax = remaining - max;
    if (tailAfterMax === 1) {
      chunks.push(lines.slice(i, i + max + 1));
      i += max + 1;
    } else {
      chunks.push(lines.slice(i, i + max));
      i += max;
    }
  }
  return chunks;
}

export function splitVerseTextForDisplay(
  text: string,
  maxLinesPerEstofre: number,
): string[] {
  const normalized = normalizeVerseText(text);
  if (!normalized.trim()) return [];
  const lines = normalized.split('\n');
  return splitVerseLinesForDisplay(lines, maxLinesPerEstofre).map((chunk) =>
    chunk.join('\n'),
  );
}

export interface VerseLike {
  id: number;
  text: string;
}

/** Expande versos da BD em blocos de exibição (ids sintéticos estáveis por verso). */
export function expandVersesForDisplay<T extends VerseLike>(
  verses: T[],
  maxLinesPerEstofre: number,
): T[] {
  const max = clampMaxEstofreLines(maxLinesPerEstofre);
  const out: T[] = [];
  for (const verse of verses) {
    const parts = splitVerseTextForDisplay(verse.text, max);
    if (!parts.length) continue;
    if (parts.length === 1) {
      out.push(verse);
      continue;
    }
    parts.forEach((text, partIndex) => {
      out.push({
        ...verse,
        id: verse.id * 1000 + partIndex,
        text,
      });
    });
  }
  return out;
}
