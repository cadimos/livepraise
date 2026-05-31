import { Router, type Request, type Response } from 'express';
import {
  dbAll,
  dbRun,
  getMainDb,
  isDbError,
} from '../db/connection.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors } from '../middleware/common.js';

export function createDisplayRouter(): Router {
  const api = Router();
  const db = getMainDb();

  api.get('/', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const items = dbAll(db, 'SELECT * FROM tela');
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'successo', data: items });
  });

  api.get('/:tipo/:largura/:altura', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const { tipo, largura, altura } = req.params;

    const updateResult = dbRun(
      db,
      'UPDATE tela SET tipo = ?, largura = ?, altura = ?',
      [tipo, largura, altura],
    );
    if (isDbError(updateResult)) {
      res.json(updateResult);
      return;
    }

    const items = dbAll(db, 'SELECT * FROM tela');
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'successo', data: items });
  });

  return api;
}
