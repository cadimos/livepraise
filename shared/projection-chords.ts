/** Remove linhas de cifra (CA-R24) — partilhado operador/web. */
export function stripChordsForProjection(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*[A-G][#b]?(\/|\s|$)/.test(line.trim()))
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
