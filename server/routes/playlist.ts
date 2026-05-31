import { Router, type Request, type Response } from 'express';
import { dbAll, getMainDb, isDbError } from '../db/connection.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

export function createPlaylistRouter(): Router {
  const api = Router();
  const db = getMainDb();

  /** Resolve existência de músicas na BD local (importação cross-instalação). */
  api.post('/resolve', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const raw = req.body?.songIds;
    if (!Array.isArray(raw)) {
      jsonError(res, 400, 'songIds deve ser um array.');
      return;
    }
    const songIds = [...new Set(raw.map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0))];
    if (!songIds.length) {
      res.json({ status: 'Sucesso', items: [] });
      return;
    }
    const placeholders = songIds.map(() => '?').join(',');
    const rows = dbAll(
      db,
      `SELECT id, nome, nome2, artista FROM musica WHERE id IN (${placeholders})`,
      songIds,
    );
    if (isDbError(rows)) {
      res.json(rows);
      return;
    }
    const byId = new Map(
      rows.map((r) => [
        Number(r.id),
        {
          id: Number(r.id),
          nome: String(r.nome ?? ''),
          nome2: r.nome2 != null ? String(r.nome2) : undefined,
          artista: String(r.artista ?? ''),
        },
      ]),
    );
    const items = songIds.map((id) => {
      const row = byId.get(id);
      if (!row) {
        return { id, exists: false as const };
      }
      return {
        id,
        exists: true as const,
        nome: row.nome,
        nome2: row.nome2,
        artista: row.artista,
      };
    });
    res.json({ status: 'Sucesso', items });
  });

  return api;
}
