import { Router, type Request, type Response } from 'express';
import {
  buildMusicRepertoireExport,
  importMusicRepertoire,
} from '../../core/music/repertoire.js';
import {
  dbAll,
  dbRun,
  getMainDb,
  isDbError,
} from '../db/connection.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';
import {
  MusicRepertoireValidationError,
  parseMusicRepertoireJson,
  parseMusicRepertoireObject,
  type MusicRepertoireIdConflict,
} from '../../shared/music-repertoire.js';

export function createMusicRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.get('/categoria', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const items = dbAll(db, 'SELECT * FROM cat_musicas');
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.get('/categoria/:codigo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const codigo = req.params.codigo;
    const items = dbAll(
      db,
      `SELECT m.*,
        (SELECT GROUP_CONCAT(mv.verso, ' ')
         FROM musica_versos mv
         WHERE mv.musica = m.id) AS texto_versos
       FROM musica m
       WHERE m.cat = ?
       ORDER BY m.nome2 ASC`,
      [codigo],
    );
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.get('/verso/:codigo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const codigo = req.params.codigo;
    const items = dbAll(
      db,
      'SELECT * FROM musica_versos WHERE musica = ? ORDER BY id ASC',
      [codigo],
    );
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.get('/export', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const categoryRaw = req.query.categoryId;
    const songIdsRaw = req.query.songIds;
    const categoryId =
      typeof categoryRaw === 'string' && categoryRaw.trim()
        ? Number(categoryRaw)
        : undefined;
    const songIds =
      typeof songIdsRaw === 'string' && songIdsRaw.trim()
        ? songIdsRaw
            .split(',')
            .map((part) => Number(part.trim()))
            .filter((id) => Number.isFinite(id) && id > 0)
        : undefined;

    const payload = buildMusicRepertoireExport(db, {
      categoryId:
        categoryId != null && Number.isFinite(categoryId) && categoryId > 0
          ? categoryId
          : undefined,
      songIds,
    });
    if (isDbError(payload)) {
      jsonError(res, 400, String(payload.mensagem));
      return;
    }
    res.json({ status: 'Sucesso', file: payload });
  });

  api.post('/import', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const conflictRaw = req.query.idConflict ?? req.body?.idConflict;
    const idConflict: MusicRepertoireIdConflict =
      conflictRaw === 'skip' || conflictRaw === 'overwrite' ? conflictRaw : 'remap';

    let file;
    try {
      if (typeof req.body === 'string') {
        file = parseMusicRepertoireJson(req.body);
      } else if (req.body?.format === 'livepraise-music-repertoire') {
        file = parseMusicRepertoireObject(req.body);
      } else if (req.body?.file) {
        file = parseMusicRepertoireObject(req.body.file);
      } else {
        jsonError(res, 400, 'Corpo de importação inválido');
        return;
      }
    } catch (err) {
      const message =
        err instanceof MusicRepertoireValidationError
          ? err.message
          : 'Ficheiro de repertório inválido';
      jsonError(res, 400, message);
      return;
    }

    const result = importMusicRepertoire(db, file, idConflict);
    if (isDbError(result)) {
      jsonError(res, 400, String(result.mensagem));
      return;
    }
    res.json({ status: 'successo', result });
  });

  api.get('/:codigo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const codigo = req.params.codigo;
    const items = dbAll(db, 'SELECT * FROM musica WHERE id = ?', [codigo]);
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.post('/', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const errors: string[] = [];
    if (!req.body.cat) errors.push('Categoria Obrigatória');
    if (!req.body.nome) errors.push('Nome Obrigatório');
    if (!req.body.artista) errors.push('Artista Obrigatório');
    if (errors.length) {
      jsonError(res, 400, errors.join(','));
      return;
    }

    const data = {
      cat: String(req.body.cat),
      nome: String(req.body.nome),
      artista: String(req.body.artista),
      compositor: req.body.compositor ? String(req.body.compositor) : '',
    };

    const info = dbRun(
      db,
      'INSERT INTO musica (cat, nome, nome2, artista, compositor) VALUES (?,?,?,?,?)',
      [data.cat, data.nome, data.nome, data.artista, data.compositor],
    );
    if (isDbError(info)) {
      res.json(info);
      return;
    }

    res.json({ status: 'successo', data, id: info });
  });

  api.post('/verso', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const errors: string[] = [];
    if (!req.body.musica) errors.push('Id da Musica Obrigatória');
    if (!req.body.verso) errors.push('Verso Obrigatório');
    if (errors.length) {
      jsonError(res, 400, errors.join(','));
      return;
    }

    const data = {
      musica: String(req.body.musica),
      verso: String(req.body.verso),
    };

    const info = dbRun(
      db,
      'INSERT INTO musica_versos (musica, verso) VALUES (?,?)',
      [data.musica, data.verso],
    );
    if (isDbError(info)) {
      res.json(info);
      return;
    }

    res.json({ status: 'successo', data, id: info });
  });

  api.post('/:codigo', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const codigo = req.params.codigo;
    const errors: string[] = [];
    if (!req.body.cat) errors.push('Categoria Obrigatória');
    if (!req.body.nome) errors.push('Nome Obrigatório');
    if (!req.body.artista) errors.push('Artista Obrigatório');
    if (errors.length) {
      jsonError(res, 400, errors.join(','));
      return;
    }

    const data = {
      cat: String(req.body.cat),
      nome: String(req.body.nome),
      artista: String(req.body.artista),
      compositor: req.body.compositor ? String(req.body.compositor) : '',
    };

    const updateResult = dbRun(
      db,
      'UPDATE musica SET cat=?, nome=?, nome2=?, artista=?, compositor=? WHERE id=?',
      [data.cat, data.nome, data.nome, data.artista, data.compositor, codigo],
    );
    if (isDbError(updateResult)) {
      res.json(updateResult);
      return;
    }

    dbRun(db, 'DELETE FROM musica_versos WHERE musica=?', [codigo]);
    res.json({ status: 'successo', data, id: codigo });
  });

  api.delete('/:codigo', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const codigo = req.params.codigo;
    const versesResult = dbRun(db, 'DELETE FROM musica_versos WHERE musica=?', [codigo]);
    if (isDbError(versesResult)) {
      res.json(versesResult);
      return;
    }
    const songResult = dbRun(db, 'DELETE FROM musica WHERE id=?', [codigo]);
    if (isDbError(songResult)) {
      res.json(songResult);
      return;
    }
    res.json({ status: 'successo', id: codigo });
  });

  return api;
}
