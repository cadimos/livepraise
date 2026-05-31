import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import {
  mediaPathParts,
  resolveMediaRelativePath,
  type MediaKind,
} from '../../core/security/media-file.js';
import { resolveMediaCategoryDir } from '../../core/security/media-category.js';
import { getLivepraiseHome } from '../config/paths.js';
import { allowCors, jsonError } from '../middleware/common.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import {
  getVideoPipelineState,
  scheduleVideoPipeline,
} from '../services/videoPipeline.js';

function listImageCategories(): string[] {
  const dir = path.join(getLivepraiseHome(), 'imagens');
  if (!fs.existsSync(dir)) return [];

  const cat: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      cat.push(name.replace(path.join(getLivepraiseHome(), 'imagens') + path.sep, ''));
    }
  }
  return cat.sort();
}

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function mediaProperties(
  home: string,
  kind: MediaKind,
  relativePath: string,
): Record<string, string | number> | null {
  const abs = resolveMediaRelativePath(home, kind, relativePath);
  if (!abs) return null;

  const parts = mediaPathParts(relativePath.replaceAll('\\', '/'), kind);
  if (!parts) return null;

  const stat = fs.statSync(abs);
  return {
    path: relativePath.replaceAll('\\', '/'),
    name: parts.fileName,
    category: parts.category,
    sizeBytes: stat.size,
    sizeLabel: formatBytes(stat.size),
    modifiedAt: stat.mtime.toISOString(),
    extension: path.extname(parts.fileName).replace(/^\./, '') || '—',
  };
}

function moveMediaFile(
  home: string,
  kind: MediaKind,
  relativePath: string,
  toCategory: string,
): string | null {
  const abs = resolveMediaRelativePath(home, kind, relativePath);
  if (!abs) return null;

  const destDir = resolveMediaCategoryDir(home, kind, toCategory);
  if (!destDir) return null;

  const parts = mediaPathParts(relativePath.replaceAll('\\', '/'), kind);
  if (!parts) return null;

  const destAbs = path.join(destDir, parts.fileName);
  if (fs.existsSync(destAbs)) {
    return null;
  }

  fs.renameSync(abs, destAbs);

  if (kind === 'videos') {
    const thumbDir = path.join(destDir, 'thumb');
    const oldThumb = path.join(
      path.dirname(abs),
      'thumb',
      parts.fileName.replace(path.extname(parts.fileName), '.jpg'),
    );
    if (fs.existsSync(oldThumb)) {
      if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
      const destThumb = path.join(
        thumbDir,
        parts.fileName.replace(path.extname(parts.fileName), '.jpg'),
      );
      if (!fs.existsSync(destThumb)) {
        fs.renameSync(oldThumb, destThumb);
      }
    }
  }

  return `${kind}/${toCategory}/${parts.fileName}`.replaceAll('\\', '/');
}

function registerMediaMutations(api: Router, kind: MediaKind): void {
  const home = getLivepraiseHome();

  api.get('/propriedades', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const rel = String(req.query.path ?? '');
    const props = mediaProperties(home, kind, rel);
    if (!props) {
      jsonError(res, 400, 'Ficheiro inválido');
      return;
    }
    res.json({ status: 'successo', ...props });
  });

  api.patch(
    '/categoria',
    requireOperatorAccess,
    (req: Request, res: Response) => {
      allowCors(req, res, () => {});
      const body = req.body as { path?: string; toCategory?: string };
      const rel = String(body.path ?? '');
      const toCategory = String(body.toCategory ?? '');
      if (!rel || !toCategory) {
        jsonError(res, 400, 'path e toCategory são obrigatórios');
        return;
      }

      const moved = moveMediaFile(home, kind, rel, toCategory);
      if (!moved) {
        jsonError(res, 400, 'Não foi possível mover o ficheiro');
        return;
      }
      res.json({ status: 'successo', path: moved });
    },
  );
}

export function createImageRouter(): Router {
  const api = Router();
  const home = getLivepraiseHome();

  api.get('/categoria', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    res.json({ status: 'successo', imagens: listImageCategories() });
  });

  api.get('/categoria/:codigo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const dir = resolveMediaCategoryDir(home, 'imagens', String(req.params.codigo));
    if (!dir) {
      jsonError(res, 400, 'Categoria inválida');
      return;
    }

    const imagens: string[] = [];
    for (const file of fs.readdirSync(dir)) {
      const name = path.join(dir, file);
      if (!fs.statSync(name).isDirectory()) {
        imagens.push(name.replace(home + path.sep, '').replaceAll('\\', '/'));
      }
    }

    res.json({ status: 'successo', imagens });
  });

  registerMediaMutations(api, 'imagens');
  return api;
}

export function createVideoRouter(): Router {
  const api = Router();
  const home = getLivepraiseHome();

  api.get('/categoria', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const dir = path.join(home, 'videos');
    const cat: string[] = [];

    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
          cat.push(name.replace(path.join(home, 'videos') + path.sep, ''));
        }
      }
    }

    cat.sort();
    res.json({ status: 'successo', videos: cat });
  });

  api.get('/categoria/:codigo', (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const catDir = resolveMediaCategoryDir(home, 'videos', String(req.params.codigo));
    if (!catDir) {
      jsonError(res, 400, 'Categoria inválida');
      return;
    }

    const cat = path.basename(catDir);
    const videos: {
      video: string;
      thumb: string;
      pipelineStatus: string;
      pipelinePercent: number;
      pipelineError?: string;
    }[] = [];

    for (const file of fs.readdirSync(catDir)) {
      const name = path.join(catDir, file);
      if (fs.statSync(name).isDirectory()) continue;
      if (file === 'thumb') continue;

      const rel = name.replace(home + path.sep, '').replaceAll('\\', '/');
      scheduleVideoPipeline(home, rel);
      const state = getVideoPipelineState(rel);
      const base = path.basename(file, path.extname(file));
      const mp4Rel = `videos/${cat}/${base}.mp4`;
      const listedRel =
        path.extname(file).toLowerCase() !== '.mp4' &&
        fs.existsSync(path.join(home, mp4Rel))
          ? mp4Rel
          : rel;
      const preview = `videos/${cat}/thumb/${base}.jpg`;
      const thumbAbs = path.join(home, preview);

      videos.push({
        video: listedRel,
        thumb: fs.existsSync(thumbAbs) ? preview : '',
        pipelineStatus: state.status,
        pipelinePercent: state.percent,
        ...(state.error ? { pipelineError: state.error } : {}),
      });
    }

    res.json({ status: 'successo', videos });
  });

  registerMediaMutations(api, 'videos');
  return api;
}
