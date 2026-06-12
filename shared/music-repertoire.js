/** Formato versionado de exportação/importação do repertório (louvores). */
export const MUSIC_REPERTOIRE_FORMAT = 'livepraise-music-repertoire';
export const MUSIC_REPERTOIRE_VERSION = 1;
export const MUSIC_REPERTOIRE_MAX_BYTES = 8 * 1024 * 1024;
export class MusicRepertoireValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MusicRepertoireValidationError';
    }
}
function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
function parseCategory(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const id = row.id;
    const nome = row.nome;
    if (typeof id !== 'number' || !Number.isFinite(id) || id <= 0)
        return null;
    if (!isNonEmptyString(nome))
        return null;
    const nome2 = row.nome2;
    return {
        id,
        nome: String(nome).trim(),
        nome2: typeof nome2 === 'string' && nome2.trim() ? nome2.trim() : undefined,
    };
}
function parseSong(raw) {
    if (!raw || typeof raw !== 'object')
        return null;
    const row = raw;
    const categoryId = row.categoryId;
    const nome = row.nome;
    const artista = row.artista;
    if (typeof categoryId !== 'number' || !Number.isFinite(categoryId) || categoryId <= 0) {
        return null;
    }
    if (!isNonEmptyString(nome) || !isNonEmptyString(artista))
        return null;
    const versesRaw = row.verses;
    if (!Array.isArray(versesRaw))
        return null;
    const verses = versesRaw
        .map((v) => (typeof v === 'string' ? v : ''))
        .filter((v) => v.length > 0);
    if (!verses.length)
        return null;
    const sourceId = row.sourceId;
    const compositor = row.compositor;
    return {
        sourceId: typeof sourceId === 'number' && Number.isFinite(sourceId) && sourceId > 0
            ? sourceId
            : undefined,
        categoryId,
        nome: String(nome).trim(),
        artista: String(artista).trim(),
        compositor: typeof compositor === 'string' ? compositor : '',
        verses,
    };
}
export function parseMusicRepertoireJson(raw, maxBytes = MUSIC_REPERTOIRE_MAX_BYTES) {
    if (typeof raw !== 'string') {
        throw new MusicRepertoireValidationError('Corpo JSON inválido');
    }
    if (new TextEncoder().encode(raw).length > maxBytes) {
        throw new MusicRepertoireValidationError(`Ficheiro excede o limite de ${maxBytes} bytes`);
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        throw new MusicRepertoireValidationError('JSON malformado');
    }
    return parseMusicRepertoireObject(parsed);
}
export function parseMusicRepertoireObject(parsed) {
    if (!parsed || typeof parsed !== 'object') {
        throw new MusicRepertoireValidationError('Estrutura de exportação inválida');
    }
    const root = parsed;
    if (root.format !== MUSIC_REPERTOIRE_FORMAT) {
        throw new MusicRepertoireValidationError('Formato de exportação não reconhecido');
    }
    if (root.version !== MUSIC_REPERTOIRE_VERSION) {
        throw new MusicRepertoireValidationError('Versão de exportação não suportada');
    }
    if (typeof root.exportedAt !== 'string' || !root.exportedAt.trim()) {
        throw new MusicRepertoireValidationError('Data de exportação inválida');
    }
    if (!Array.isArray(root.categories) || !Array.isArray(root.songs)) {
        throw new MusicRepertoireValidationError('Categorias ou músicas em falta');
    }
    if (!root.songs.length) {
        throw new MusicRepertoireValidationError('Exportação sem músicas');
    }
    const categories = root.categories
        .map(parseCategory)
        .filter((c) => c != null);
    const songs = root.songs
        .map(parseSong)
        .filter((s) => s != null);
    if (!songs.length) {
        throw new MusicRepertoireValidationError('Nenhuma música válida no ficheiro');
    }
    const categoryIds = new Set(categories.map((c) => c.id));
    for (const song of songs) {
        if (!categoryIds.has(song.categoryId)) {
            throw new MusicRepertoireValidationError(`Categoria ${song.categoryId} em falta para «${song.nome}»`);
        }
    }
    const appVersion = root.appVersion;
    return {
        format: MUSIC_REPERTOIRE_FORMAT,
        version: MUSIC_REPERTOIRE_VERSION,
        exportedAt: root.exportedAt,
        appVersion: typeof appVersion === 'string' ? appVersion : undefined,
        categories,
        songs,
    };
}
export function countRepertoireVerses(file) {
    return file.songs.reduce((sum, song) => sum + song.verses.length, 0);
}
