import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import {
  dbAll,
  dbRun,
  getMainDb,
  isDbError,
  openDbAt,
} from '../db/connection.js';
import { resolveMediaRelativePath } from '../../core/security/media-file.js';
import { getLivepraiseHome } from '../config/paths.js';
import { allowCors, jsonError } from '../middleware/common.js';
import { requireOperatorAccess } from '../middleware/auth.js';

function resolveBibleFile(
  bibliasDir: string,
  bibliaParam: string,
): string | null {
  const raw = String(bibliaParam);
  const base = path.basename(raw);
  if (!base || base !== raw || raw.includes('..')) return null;
  if (!fs.existsSync(bibliasDir)) return null;

  const allowed = fs.readdirSync(bibliasDir);
  if (!allowed.includes(base)) return null;

  const fullPath = path.join(bibliasDir, base);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;
  if (!base.includes('sqlite')) return null;

  const resolved = path.resolve(fullPath);
  const resolvedDir = path.resolve(bibliasDir);
  if (resolved !== resolvedDir && !resolved.startsWith(`${resolvedDir}${path.sep}`)) {
    return null;
  }

  return resolved;
}

export function createBibleRouter(): Router {
  const api = Router();
  const bibliasDir = path.join(getLivepraiseHome(), 'biblias');

  api.get('/', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const items: { nome: string; arquivo: string }[] = [];

    if (!fs.existsSync(bibliasDir)) {
      res.json({ status: 'successo', biblias: items });
      return;
    }

    for (const file of fs.readdirSync(bibliasDir)) {
      const fullPath = path.join(bibliasDir, file);
      if (!fs.statSync(fullPath).isFile() || !file.includes('sqlite')) continue;

      const bibleDb = openDbAt(fullPath);
      const rows = dbAll<{ value: string }>(
        bibleDb,
        "SELECT value FROM metadata WHERE `key` LIKE 'copyright'",
      );
      bibleDb.close();

      if (isDbError(rows) || rows.length === 0) continue;
      items.push({ nome: rows[0].value, arquivo: file });
    }

    res.json({ status: 'successo', biblias: items });
  });

  api.get('/livros/:biblia', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const biblePath = resolveBibleFile(bibliasDir, String(req.params.biblia));
    if (!biblePath) {
      jsonError(res, 400, 'Bíblia inválida');
      return;
    }
    const bibleDb = openDbAt(biblePath);
    const items = dbAll(bibleDb, 'SELECT id, name as nome FROM book');
    bibleDb.close();

    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.get('/capitulo/:biblia/:livro', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const { livro } = req.params;
    const biblePath = resolveBibleFile(bibliasDir, String(req.params.biblia));
    if (!biblePath) {
      jsonError(res, 400, 'Bíblia inválida');
      return;
    }
    const bibleDb = openDbAt(biblePath);
    const items = dbAll(
      bibleDb,
      'SELECT COUNT(DISTINCT(chapter)) as capitulos FROM verse WHERE book_id = ?',
      [livro],
    );
    bibleDb.close();

    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  api.get('/versiculo/:biblia/:livro/:capitulo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const { livro, capitulo } = req.params;
    const biblePath = resolveBibleFile(bibliasDir, String(req.params.biblia));
    if (!biblePath) {
      jsonError(res, 400, 'Bíblia inválida');
      return;
    }
    const bibleDb = openDbAt(biblePath);
    const nomeLivro = dbAll<{ name: string }>(
      bibleDb,
      'SELECT name FROM book WHERE book_reference_id = ?',
      [livro],
    );
    const items = dbAll(
      bibleDb,
      'SELECT id, text as texto, verse as versiculo FROM verse WHERE book_id = ? AND chapter = ?',
      [livro, capitulo],
    );
    bibleDb.close();

    if (isDbError(items)) {
      res.json(items);
      return;
    }

    const livroNome =
      !isDbError(nomeLivro) && nomeLivro.length > 0 ? nomeLivro[0].name : '';
    res.json({ status: 'Sucesso', livro: livroNome, items });
  });

  return api;
}

export function createBackgroundRouter(): Router {
  const router = Router();
  const db = getMainDb();

  router.get('/background-rapido', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const items = dbAll(
      db,
      'SELECT id, url, diretorio, inicial FROM background_rapido ORDER BY id ASC',
    );
    if (isDbError(items)) {
      res.json(items);
      return;
    }
    res.json({ status: 'Sucesso', items });
  });

  router.patch(
    '/background-rapido/:id',
    requireOperatorAccess,
    (req: Request, res: Response) => {
      allowCors(req, res, () => {});
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        jsonError(res, 400, 'ID inválido');
        return;
      }

      const body = req.body as { url?: string; diretorio?: string };
      const url = String(body.url ?? '').replaceAll('\\', '/');
      const diretorio = String(body.diretorio ?? '');
      if (!url || !diretorio) {
        jsonError(res, 400, 'url e diretorio são obrigatórios');
        return;
      }

      if (url.includes('base64')) {
        jsonError(res, 400, 'Substituição por base64 não suportada');
        return;
      }

      const kind = diretorio === 'videos' ? 'videos' : diretorio === 'imagens' ? 'imagens' : null;
      if (!kind) {
        jsonError(res, 400, 'diretorio inválido');
        return;
      }

      const home = getLivepraiseHome();
      if (!resolveMediaRelativePath(home, kind, url)) {
        jsonError(res, 400, 'Ficheiro de mídia inválido');
        return;
      }

      const changes = dbRun(
        db,
        'UPDATE background_rapido SET url = ?, diretorio = ? WHERE id = ?',
        [url, diretorio, id],
      );
      if (isDbError(changes)) {
        res.json(changes);
        return;
      }
      if (changes === 0) {
        jsonError(res, 404, 'Fundo rápido não encontrado');
        return;
      }
      res.json({ status: 'Sucesso', id, url, diretorio });
    },
  );

  return router;
}
