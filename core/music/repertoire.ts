import type { Database } from '../../server/db/connection.js';
import { dbAll, dbRun, isDbError } from '../../server/db/connection.js';
import { APP_VERSION } from '../../shared/app-version.js';
import {
  countRepertoireVerses,
  type MusicRepertoireCategory,
  type MusicRepertoireFile,
  type MusicRepertoireIdConflict,
  type MusicRepertoireSong,
  MUSIC_REPERTOIRE_FORMAT,
  MUSIC_REPERTOIRE_VERSION,
} from '../../shared/music-repertoire.js';

interface CatRow extends Record<string, unknown> {
  id: number;
  nome: string | null;
  nome2: string | null;
}

interface SongRow extends Record<string, unknown> {
  id: number;
  cat: string;
  nome: string;
  nome2: string | null;
  artista: string;
  compositor: string | null;
}

interface VerseRow extends Record<string, unknown> {
  id: number;
  musica: string;
  verso: string;
}

export interface MusicRepertoireExportOptions {
  categoryId?: number;
  songIds?: number[];
}

export interface MusicRepertoireImportResult {
  categoriesCreated: number;
  categoriesReused: number;
  songsImported: number;
  songsSkipped: number;
  versesImported: number;
}

function normalizeNome2(nome: string, nome2?: string | null): string {
  const hit = (nome2 ?? nome).trim();
  return hit || nome.trim();
}

function loadSongsForExport(
  db: Database,
  options: MusicRepertoireExportOptions,
): SongRow[] | { status: 'Error'; mensagem: unknown } {
  if (options.songIds?.length) {
    const ids = [...new Set(options.songIds.filter((id) => Number.isFinite(id) && id > 0))];
    if (!ids.length) return [];
    const placeholders = ids.map(() => '?').join(',');
    return dbAll<SongRow>(
      db,
      `SELECT * FROM musica WHERE id IN (${placeholders}) ORDER BY nome2 ASC`,
      ids,
    );
  }
  if (options.categoryId != null && options.categoryId > 0) {
    return dbAll<SongRow>(
      db,
      'SELECT * FROM musica WHERE cat = ? ORDER BY nome2 ASC',
      [String(options.categoryId)],
    );
  }
  return dbAll<SongRow>(db, 'SELECT * FROM musica ORDER BY nome2 ASC');
}

export function buildMusicRepertoireExport(
  db: Database,
  options: MusicRepertoireExportOptions = {},
): MusicRepertoireFile | { status: 'Error'; mensagem: unknown } {
  const songsResult = loadSongsForExport(db, options);
  if (isDbError(songsResult)) return songsResult;
  if (!songsResult.length) {
    return { status: 'Error', mensagem: 'Nenhuma música para exportar' };
  }

  const categoryIdSet = new Set<number>();
  const exportSongs: MusicRepertoireSong[] = [];

  for (const song of songsResult) {
    const catId = Number(song.cat);
    if (Number.isFinite(catId) && catId > 0) categoryIdSet.add(catId);

    const versesResult = dbAll<VerseRow>(
      db,
      'SELECT verso FROM musica_versos WHERE musica = ? ORDER BY id ASC',
      [String(song.id)],
    );
    if (isDbError(versesResult)) return versesResult;
    const verses = versesResult
      .map((v) => (typeof v.verso === 'string' ? v.verso : ''))
      .filter((v) => v.length > 0);
    if (!verses.length) continue;

    exportSongs.push({
      sourceId: song.id,
      categoryId: Number.isFinite(catId) && catId > 0 ? catId : 1,
      nome: String(song.nome ?? ''),
      artista: String(song.artista ?? ''),
      compositor: song.compositor ? String(song.compositor) : '',
      verses,
    });
  }

  if (!exportSongs.length) {
    return { status: 'Error', mensagem: 'Nenhuma música com versos para exportar' };
  }

  const categoriesResult = dbAll<CatRow>(db, 'SELECT * FROM cat_musicas');
  if (isDbError(categoriesResult)) return categoriesResult;

  const categories: MusicRepertoireCategory[] = categoriesResult
    .filter((c) => categoryIdSet.has(c.id))
    .map((c) => ({
      id: c.id,
      nome: String(c.nome ?? ''),
      nome2: c.nome2 ? String(c.nome2) : undefined,
    }));

  for (const catId of categoryIdSet) {
    if (!categories.some((c) => c.id === catId)) {
      categories.push({ id: catId, nome: `Categoria ${catId}` });
    }
  }

  return {
    format: MUSIC_REPERTOIRE_FORMAT,
    version: MUSIC_REPERTOIRE_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    categories,
    songs: exportSongs,
  };
}

function resolveCategoryMap(
  db: Database,
  categories: MusicRepertoireCategory[],
): Map<number, number> | { status: 'Error'; mensagem: unknown } {
  const existing = dbAll<CatRow>(db, 'SELECT * FROM cat_musicas');
  if (isDbError(existing)) return existing;

  const byId = new Map(existing.map((c) => [c.id, c]));
  const byNome2 = new Map(
    existing
      .filter((c) => c.nome2)
      .map((c) => [String(c.nome2).trim().toLowerCase(), c]),
  );

  const map = new Map<number, number>();
  for (const cat of categories) {
    const nome2Key = normalizeNome2(cat.nome, cat.nome2).toLowerCase();
    const hitById = byId.get(cat.id);
    if (hitById && normalizeNome2(String(hitById.nome ?? ''), hitById.nome2).toLowerCase() === nome2Key) {
      map.set(cat.id, hitById.id);
      continue;
    }
    const hitByNome2 = byNome2.get(nome2Key);
    if (hitByNome2) {
      map.set(cat.id, hitByNome2.id);
      continue;
    }
    const inserted = dbRun(
      db,
      'INSERT INTO cat_musicas (nome, nome2) VALUES (?, ?)',
      [cat.nome, normalizeNome2(cat.nome, cat.nome2)],
    );
    if (isDbError(inserted)) return inserted;
    map.set(cat.id, inserted);
    byId.set(inserted, { id: inserted, nome: cat.nome, nome2: normalizeNome2(cat.nome, cat.nome2) });
    byNome2.set(nome2Key, byId.get(inserted)!);
  }
  return map;
}

function songExistsBySourceId(db: Database, sourceId: number): boolean {
  const rows = dbAll<{ id: number }>(db, 'SELECT id FROM musica WHERE id = ?', [sourceId]);
  if (isDbError(rows)) return false;
  return rows.length > 0;
}

function insertSongWithVerses(
  db: Database,
  song: MusicRepertoireSong,
  categoryId: number,
): number | { status: 'Error'; mensagem: unknown } {
  const nome2 = normalizeNome2(song.nome, song.nome);
  const songId = dbRun(
    db,
    'INSERT INTO musica (cat, nome, nome2, artista, compositor) VALUES (?,?,?,?,?)',
    [String(categoryId), song.nome, nome2, song.artista, song.compositor ?? ''],
  );
  if (isDbError(songId)) return songId;

  for (const verso of song.verses) {
    const verseId = dbRun(
      db,
      'INSERT INTO musica_versos (musica, verso) VALUES (?,?)',
      [String(songId), verso],
    );
    if (isDbError(verseId)) return verseId;
  }
  return songId;
}

function overwriteSongWithVerses(
  db: Database,
  sourceId: number,
  song: MusicRepertoireSong,
  categoryId: number,
): number | { status: 'Error'; mensagem: unknown } {
  const nome2 = normalizeNome2(song.nome, song.nome);
  const updated = dbRun(
    db,
    'UPDATE musica SET cat=?, nome=?, nome2=?, artista=?, compositor=? WHERE id=?',
    [String(categoryId), song.nome, nome2, song.artista, song.compositor ?? '', sourceId],
  );
  if (isDbError(updated)) return updated;

  const deleted = dbRun(db, 'DELETE FROM musica_versos WHERE musica=?', [String(sourceId)]);
  if (isDbError(deleted)) return deleted;

  for (const verso of song.verses) {
    const verseId = dbRun(
      db,
      'INSERT INTO musica_versos (musica, verso) VALUES (?,?)',
      [String(sourceId), verso],
    );
    if (isDbError(verseId)) return verseId;
  }
  return sourceId;
}

export function importMusicRepertoire(
  db: Database,
  file: MusicRepertoireFile,
  idConflict: MusicRepertoireIdConflict = 'remap',
): MusicRepertoireImportResult | { status: 'Error'; mensagem: unknown } {
  const categoryMap = resolveCategoryMap(db, file.categories);
  if (isDbError(categoryMap)) return categoryMap;

  let categoriesCreated = 0;
  let categoriesReused = 0;
  const existingCats = dbAll<CatRow>(db, 'SELECT id FROM cat_musicas');
  if (isDbError(existingCats)) return existingCats;
  const existingIds = new Set(existingCats.map((c) => c.id));

  for (const cat of file.categories) {
    const targetId = categoryMap.get(cat.id);
    if (targetId == null) continue;
    if (existingIds.has(targetId) && targetId === cat.id) {
      categoriesReused += 1;
    } else if (!existingIds.has(targetId)) {
      categoriesCreated += 1;
      existingIds.add(targetId);
    } else {
      categoriesReused += 1;
    }
  }

  let songsImported = 0;
  let songsSkipped = 0;
  let versesImported = 0;

  for (const song of file.songs) {
    const targetCategoryId = categoryMap.get(song.categoryId);
    if (targetCategoryId == null) {
      return { status: 'Error', mensagem: `Categoria ${song.categoryId} não mapeada` };
    }

    const sourceId = song.sourceId;
    if (idConflict === 'skip' && sourceId != null && songExistsBySourceId(db, sourceId)) {
      songsSkipped += 1;
      continue;
    }

    if (idConflict === 'overwrite' && sourceId != null && songExistsBySourceId(db, sourceId)) {
      const result = overwriteSongWithVerses(db, sourceId, song, targetCategoryId);
      if (isDbError(result)) return result;
      songsImported += 1;
      versesImported += song.verses.length;
      continue;
    }

    const result = insertSongWithVerses(db, song, targetCategoryId);
    if (isDbError(result)) return result;
    songsImported += 1;
    versesImported += song.verses.length;
  }

  return {
    categoriesCreated,
    categoriesReused,
    songsImported,
    songsSkipped,
    versesImported,
  };
}

export function repertoireVerseCount(file: MusicRepertoireFile): number {
  return countRepertoireVerses(file);
}
