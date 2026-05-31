export interface BibleBookLike {
  id: number;
  nome: string;
}

export interface ParsedBibleReference {
  bookQuery: string;
  chapter?: number;
  verse?: number;
}

export function normalizeBibleText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Paridade com `buscaBiblia` (monitor.js v0.0.8): livro, capítulo e versículo opcionais. */
export function parseBibleReference(raw: string): ParsedBibleReference | null {
  const texto = raw.trim();
  if (texto.length <= 1) return null;

  const regexCartasCompleto = /^([1-3])\s+(\S+)\s+(\d+)\s+(\d+)\s*$/;
  const regexCartasParcial = /^([1-3])\s+(\S+)\s+(\d+)\s*$/;
  const regexLivroCompleto = /^(\S+)\s+(\d+)\s+(\d+)\s*$/;
  const regexLivroParcial = /^(\S+)\s+(\d+)\s*$/;

  let m = texto.match(regexCartasCompleto);
  if (m) {
    return {
      bookQuery: `${m[1]} ${m[2]}`,
      chapter: Number(m[3]),
      verse: Number(m[4]),
    };
  }

  m = texto.match(regexCartasParcial);
  if (m) {
    return {
      bookQuery: `${m[1]} ${m[2]}`,
      chapter: Number(m[3]),
    };
  }

  m = texto.match(regexLivroCompleto);
  if (m) {
    return {
      bookQuery: m[1],
      chapter: Number(m[2]),
      verse: Number(m[3]),
    };
  }

  m = texto.match(regexLivroParcial);
  if (m) {
    return {
      bookQuery: m[1],
      chapter: Number(m[2]),
    };
  }

  if (/^\S+$/.test(texto)) {
    return { bookQuery: texto };
  }

  return null;
}

function pickBestMatch(
  candidates: BibleBookLike[],
  bookQuery: string,
): BibleBookLike | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const q = normalizeBibleText(bookQuery);
  return [...candidates].sort((a, b) => {
    const na = normalizeBibleText(a.nome);
    const nb = normalizeBibleText(b.nome);
    const aStarts = na.startsWith(q) ? 0 : na.includes(q) ? 1 : 2;
    const bStarts = nb.startsWith(q) ? 0 : nb.includes(q) ? 1 : 2;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return na.length - nb.length;
  })[0];
}

function findBookByNormalizedName(
  books: BibleBookLike[],
  norm: string,
): BibleBookLike | null {
  return books.find((b) => normalizeBibleText(b.nome) === norm) ?? null;
}

/** Paridade com `buscarLivro` (monitor.js): abreviações parciais; `jo` → Jó antes de João. */
export function findBookByReference(
  books: BibleBookLike[],
  bookQuery: string,
): BibleBookLike | null {
  const q = normalizeBibleText(bookQuery);
  if (!q || books.length === 0) return null;

  const entries = books.map((book) => ({
    book,
    norm: normalizeBibleText(book.nome),
  }));

  const exact = entries.find(({ norm }) => norm === q);
  if (exact) return exact.book;

  const numbered = q.match(/^([1-3])\s+(.+)$/);
  if (numbered) {
    const prefix = `${numbered[1]} `;
    const namePart = numbered[2].replace(/\s+/g, '');
    const matches = entries
      .filter(
        ({ norm }) =>
          norm.startsWith(prefix) &&
          (norm.includes(numbered[2]) ||
            norm.replace(/\s+/g, '').includes(namePart)),
      )
      .map(({ book }) => book);
    return pickBestMatch(matches, bookQuery);
  }

  // "jo" / "jó" → Jó (Job), não João
  if (q === 'jo') {
    const job = findBookByNormalizedName(books, 'jo');
    if (job) return job;
  }

  if (q === 'joao' || q.startsWith('joao')) {
    const joao = findBookByNormalizedName(books, 'joao');
    if (joao) return joao;
  }

  const matches = entries
    .filter(
      ({ norm }) =>
        norm.includes(q) ||
        norm.replace(/\s+/g, '').startsWith(q.replace(/\s+/g, '')),
    )
    .map(({ book }) => book);

  return pickBestMatch(matches, bookQuery);
}

/** Se capítulo/versículo inválidos em Jó, tenta João (ex.: `jo 22 1` inválido em Jó). */
export function findBookFallbackForReference(
  books: BibleBookLike[],
  bookQuery: string,
  primary: BibleBookLike,
  chapter?: number,
  maxChapters?: number,
): BibleBookLike | null {
  const q = normalizeBibleText(bookQuery);
  if (q !== 'jo' || normalizeBibleText(primary.nome) !== 'jo') return null;
  if (chapter == null || maxChapters == null) return null;
  if (chapter <= maxChapters) return null;
  return findBookByNormalizedName(books, 'joao');
}
