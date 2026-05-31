function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br />');
}

/** Remove linhas de cifra (CA-R24) para projeção pública. */
export function stripChordsForProjection(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^\s*[A-G][#b]?(\/|\s|$)/.test(line.trim()))
    .join('\n')
    .trim();
}

export function buildMusicHtml(verseText: string, footer: string): string {
  const body = nl2br(stripChordsForProjection(verseText));
  return `<div class="titulo"></div>
<div class="content"><span>${body}</span></div>
<div class="rodape">${escapeHtml(footer)}</div>`;
}

/** Retorno de palco: verso actual + próximo (CA-R20). */
export function buildMusicStageHtml(
  currentText: string,
  nextText: string | null,
  footer: string,
  showChords = true,
): string {
  const current = showChords ? currentText : stripChordsForProjection(currentText);
  const next = nextText
    ? showChords
      ? nextText
      : stripChordsForProjection(nextText)
    : null;
  const currentHtml = nl2br(current);
  const nextHtml = next ? nl2br(next) : '';
  const nextBlock = next
    ? `<section class="proximo"><p class="label">Próximo</p><div class="texto">${nextHtml}</div></section>`
    : '';
  return `<div class="retorno-musica">
<section class="atual"><p class="label">Agora</p><div class="texto">${currentHtml}</div></section>
${nextBlock}
<p class="rodape">${escapeHtml(footer)}</p>
</div>`;
}

export function buildBibleHtml(
  bookName: string,
  chapter: number,
  verse: number,
  text: string,
): string {
  const body = nl2br(text);
  return `<div class="titulo">${escapeHtml(bookName)} ${chapter}:${verse}</div>
<div class="content"><span>${body}</span></div>
<div class="rodape"></div>`;
}

/** Retorno de palco: apenas versículo actual (CA-R20). */
export function buildBibleStageHtml(
  bookName: string,
  chapter: number,
  verse: number,
  text: string,
): string {
  const ref = `${escapeHtml(bookName)} ${chapter}:${verse}`;
  const body = nl2br(text);
  return `<div class="retorno-biblia">
<p class="ref">${ref}</p>
<div class="texto">${body}</div>
</div>`;
}

export function encodeBackgroundUrl(url: string): string {
  return encodeURIComponent(url);
}
