/** Remove linhas de cifra (CA-R24) — partilhado operador/web. */

/**
 * Acorde completo: tónica, qualidade, extensão, alterações e baixo.
 * Alternativas longas primeiro — `m` antes de `maj` truncaria `Cmaj7`.
 */
const CHORD_TOKEN =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|m|M|\+|°|º)?\d*(?:(?:maj|min|dim|aug|sus|add|no|b|#)\d*)*(?:\([^)]*\))?(?:\/(?:[A-G][#b]?|\d+))?$/;

/**
 * Só é cifra quando *todas* as palavras da linha são acordes.
 * Testar apenas o início apagava letra em português («E ao Teu falar», «A cem bilhões...»).
 */
export function isProjectionChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/[\s|]+/).filter(Boolean);
  return tokens.every((token) => CHORD_TOKEN.test(token));
}

export function stripChordsForProjection(text: string): string {
  return text
    .split('\n')
    .filter((line) => !isProjectionChordLine(line))
    .join('\n')
    .trim();
}

/** Aplica filtro de cifras a HTML gerado pelo operador. */
export function stripChordsFromHtml(html: string): string {
  return html.replace(
    /(<(?:div|span|p)[^>]*class="[^"]*(?:content|texto)[^"]*"[^>]*>)([\s\S]*?)(<\/(?:div|span|p)>)/gi,
    (_match, open, body, close) => {
      const stripped = stripChordsForProjection(
        body.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''),
      );
      const escaped = stripped
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br />');
      return `${open}${escaped}${close}`;
    },
  );
}
