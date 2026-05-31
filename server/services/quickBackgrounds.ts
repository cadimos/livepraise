import {
  normalizeMediaRelativeRef,
  type MediaKind,
} from '../../core/security/media-file.js';
import {
  dbAll,
  dbRun,
  getMainDb,
  isDbError,
  type Database,
} from '../db/connection.js';

export function slotMatchesMediaRef(
  slotUrl: string,
  slotDiretorio: string,
  targetUrl: string,
  kind: MediaKind,
): boolean {
  if (slotUrl === targetUrl && slotDiretorio === kind) return true;
  const slotNorm = normalizeMediaRelativeRef(slotUrl, kind);
  const targetNorm = normalizeMediaRelativeRef(targetUrl, kind);
  return Boolean(slotNorm && targetNorm && slotNorm === targetNorm);
}

/** Limpa slots de fundo rápido que referenciam os paths apagados (CA-5 / CAD-304). */
export function clearQuickBackgroundSlotsForMedia(
  db: Database,
  kind: MediaKind,
  targetPaths: string[],
): number {
  if (!targetPaths.length) return 0;

  const slots = dbAll<{ id: number; url: string; diretorio: string }>(
    db,
    'SELECT id, url, diretorio FROM background_rapido',
  );
  if (isDbError(slots)) return 0;

  let cleared = 0;
  for (const slot of slots) {
    const matches = targetPaths.some((target) =>
      slotMatchesMediaRef(slot.url, slot.diretorio, target, kind),
    );
    if (!matches) continue;

    const result = dbRun(
      db,
      "UPDATE background_rapido SET url = '', diretorio = '' WHERE id = ?",
      [slot.id],
    );
    if (!isDbError(result) && result > 0) cleared += 1;
  }

  return cleared;
}

export function clearQuickBackgroundsForDeletedMedia(
  kind: MediaKind,
  targetPaths: string[],
): number {
  return clearQuickBackgroundSlotsForMedia(getMainDb(), kind, targetPaths);
}
