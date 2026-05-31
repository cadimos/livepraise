import fs from 'node:fs';
import path from 'node:path';
import { Router, type Request, type Response } from 'express';
import express from 'express';
import { appendErrorLog } from '../../core/error-log/store.js';
import { redactMediaImportUrl } from '../../core/error-log/redact-url.js';
import {
  IMAGE_EXT,
  RemoteFetchError,
  VIDEO_EXT,
  fetchRemoteMedia,
  validateMediaImportUrl,
} from '../../core/security/remote-fetch.js';
import { MEDIA_URL_IMPORT_CATEGORY } from '../../shared/queue-import.js';
import { summarizeLabel, videoThumbRelativePath } from '../../shared/queue-items.js';
import { parseYouTubeVideoId } from '../../shared/youtube.js';
import type { MediaKind } from '../../core/security/media-file.js';
import { getLivepraiseHome } from '../config/paths.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';
import { ensureWritableMediaCategory } from '../services/mediaCategory.js';
import { scheduleVideoPipeline } from '../services/videoPipeline.js';
import { importYoutubeToLibrary } from '../services/youtubeImport.js';
import {
  resolveYoutubeImportJobAsEmbed,
  retryYoutubeImportJob,
  snapshotYoutubeImportJob,
  startYoutubeImportJob,
} from '../services/youtubeImportJobs.js';

const LOG_SOURCE = 'media-url-import';

function safeFileName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()[\]]+/g, '_');
  return base || `upload-${Date.now()}`;
}

function detectKind(fileName: string): MediaKind | null {
  if (IMAGE_EXT.test(fileName)) return 'imagens';
  if (VIDEO_EXT.test(fileName)) return 'videos';
  return null;
}

function handleUpload(req: Request, res: Response): void {
  allowCors(req, res, () => {});
  const home = getLivepraiseHome();
  const category = String(req.query.category ?? 'fila').trim() || 'fila';
  const fileName = safeFileName(String(req.query.filename ?? 'upload.bin'));
  const kind = detectKind(fileName);
  if (!kind) {
    jsonError(res, 400, 'Formato de ficheiro não suportado');
    return;
  }

  const body = req.body;
  if (!Buffer.isBuffer(body) || body.length === 0) {
    jsonError(res, 400, 'Corpo do upload vazio');
    return;
  }

  const catDir = ensureWritableMediaCategory(home, kind, category);
  if (!catDir) {
    jsonError(res, 400, 'Categoria inválida');
    return;
  }

  const absPath = path.join(catDir, fileName);
  if (fs.existsSync(absPath)) {
    jsonError(res, 409, 'Já existe um ficheiro com este nome');
    return;
  }

  fs.writeFileSync(absPath, body);
  let rel = absPath.replace(home + path.sep, '').replaceAll('\\', '/');
  let thumbPath = '';

  if (kind === 'videos') {
    scheduleVideoPipeline(home, rel);
    const ext = path.extname(fileName).toLowerCase();
    const mp4Rel = rel.replace(/\.[^.]+$/i, '.mp4');
    if (ext !== '.mp4' && fs.existsSync(path.join(home, mp4Rel))) {
      rel = mp4Rel;
    }
    thumbPath = videoThumbRelativePath(rel);
  }

  res.json({
    status: 'successo',
    item: {
      kind: kind === 'imagens' ? 'image' : 'video',
      label: summarizeLabel(fileName),
      mediaPath: rel,
      ...(thumbPath ? { thumbPath } : {}),
    },
  });
}

async function handleYoutube(req: Request, res: Response): Promise<void> {
  allowCors(req, res, () => {});
  const home = getLivepraiseHome();
  const body = req.body as { url?: string; category?: string; sync?: boolean };
  const url = String(body.url ?? '').trim();
  const category = String(body.category ?? 'fila').trim() || 'fila';
  const sync = body.sync === true || req.query.sync === 'true';

  if (!url) {
    jsonError(res, 400, 'url é obrigatório');
    return;
  }

  if (!ensureWritableMediaCategory(home, 'videos', category)) {
    jsonError(res, 400, 'Categoria inválida');
    return;
  }

  if (!sync) {
    const started = startYoutubeImportJob(home, url, category);
    if (!started) {
      jsonError(res, 400, 'URL YouTube inválida');
      return;
    }
    res.json({
      status: 'successo',
      async: true,
      jobId: started.jobId,
      videoId: started.videoId,
      phase: started.phase,
      progress: started.progress,
      attempt: started.attempt,
      maxAttempts: started.maxAttempts,
      item: started.item,
    });
    return;
  }

  const result = await importYoutubeToLibrary(home, url, category);
  if (!result) {
    jsonError(res, 400, 'URL YouTube inválida');
    return;
  }

  res.json({
    status: 'successo',
    async: false,
    mode: result.mode,
    warning: result.warning,
    item: {
      kind: 'video',
      label: result.label,
      youtubeVideoId: result.mode === 'embed' ? result.videoId : undefined,
      mediaPath: result.mediaPath,
      thumbPath: result.thumbPath,
    },
  });
}

async function handleYoutubeJobStatus(req: Request, res: Response): Promise<void> {
  allowCors(req, res, () => {});
  const jobId = String(req.params.jobId ?? '').trim();
  if (!jobId) {
    jsonError(res, 400, 'jobId é obrigatório');
    return;
  }
  const snapshot = snapshotYoutubeImportJob(jobId);
  if (!snapshot) {
    jsonError(res, 404, 'Importação não encontrada');
    return;
  }
  res.json({ status: 'successo', ...snapshot });
}

async function handleYoutubeJobEmbed(req: Request, res: Response): Promise<void> {
  allowCors(req, res, () => {});
  const jobId = String(req.params.jobId ?? '').trim();
  if (!jobId) {
    jsonError(res, 400, 'jobId é obrigatório');
    return;
  }
  const snapshot = await resolveYoutubeImportJobAsEmbed(jobId);
  if (!snapshot) {
    jsonError(res, 404, 'Importação não encontrada');
    return;
  }
  res.json({ status: 'successo', ...snapshot });
}

async function handleYoutubeJobRetry(req: Request, res: Response): Promise<void> {
  allowCors(req, res, () => {});
  const jobId = String(req.params.jobId ?? '').trim();
  if (!jobId) {
    jsonError(res, 400, 'jobId é obrigatório');
    return;
  }
  const snapshot = retryYoutubeImportJob(jobId);
  if (!snapshot) {
    jsonError(res, 404, 'Importação não encontrada ou em curso');
    return;
  }
  res.json({ status: 'successo', ...snapshot });
}

function importUrlErrorMessage(code: string): string {
  switch (code) {
    case 'youtube_use_dedicated_flow':
      return 'Use o fluxo de importação YouTube';
    case 'ssrf_blocked':
      return 'Endereço não permitido';
    case 'invalid_url':
      return 'URL inválida';
    case 'unsupported_type':
      return 'Formato de ficheiro não suportado';
    case 'size_exceeded':
      return 'Ficheiro demasiado grande';
    case 'timeout':
      return 'Tempo de download excedido';
    case 'ssl_failed':
      return 'Ligação segura falhou';
    default:
      return 'Não foi possível importar a partir da URL';
  }
}

function detectKindFromPath(fileName: string): MediaKind | null {
  if (IMAGE_EXT.test(fileName)) return 'imagens';
  if (VIDEO_EXT.test(fileName)) return 'videos';
  return null;
}

function persistDownloadedMedia(
  home: string,
  kind: MediaKind,
  category: string,
  fileName: string,
  body: Buffer,
): { rel: string; thumbPath: string } | 'conflict' | 'bad-category' {
  const catDir = ensureWritableMediaCategory(home, kind, category);
  if (!catDir) return 'bad-category';

  const safeName = safeFileName(fileName);
  const absPath = path.join(catDir, safeName);
  if (fs.existsSync(absPath)) {
    return 'conflict';
  }
  fs.writeFileSync(absPath, body);
  let rel = absPath.replace(home + path.sep, '').replaceAll('\\', '/');
  let thumbPath = '';
  if (kind === 'videos') {
    scheduleVideoPipeline(home, rel);
    const ext = path.extname(safeName).toLowerCase();
    const mp4Rel = rel.replace(/\.[^.]+$/i, '.mp4');
    if (ext !== '.mp4' && fs.existsSync(path.join(home, mp4Rel))) {
      rel = mp4Rel;
    }
    thumbPath = videoThumbRelativePath(rel);
  }
  return { rel, thumbPath };
}

async function handleImportUrl(req: Request, res: Response): Promise<void> {
  allowCors(req, res, () => {});
  const home = getLivepraiseHome();
  const body = req.body as { url?: string; category?: string; mode?: string };
  const rawUrl = String(body.url ?? '').trim();
  const category =
    String(body.category ?? MEDIA_URL_IMPORT_CATEGORY).trim() || MEDIA_URL_IMPORT_CATEGORY;
  const mode = body.mode === 'reference' ? 'reference' : 'download';

  if (!rawUrl) {
    jsonError(res, 400, 'url é obrigatório', 'invalid_url');
    return;
  }

  if (parseYouTubeVideoId(rawUrl)) {
    jsonError(res, 400, importUrlErrorMessage('youtube_use_dedicated_flow'), 'youtube_use_dedicated_flow');
    return;
  }

  try {
    const validated = validateMediaImportUrl(rawUrl);

    if (mode === 'reference') {
      if (validated.protocol !== 'https:') {
        jsonError(res, 400, importUrlErrorMessage('invalid_url'), 'invalid_url');
        return;
      }
      const fileName = path.basename(validated.pathname) || 'media.bin';
      const kind = detectKindFromPath(fileName);
      if (!kind) {
        jsonError(res, 400, importUrlErrorMessage('unsupported_type'), 'unsupported_type');
        return;
      }
      if (!ensureWritableMediaCategory(home, kind, category)) {
        jsonError(res, 400, 'Categoria inválida');
        return;
      }
      res.json({
        status: 'successo',
        mode: 'reference',
        item: {
          kind: kind === 'imagens' ? 'image' : 'video',
          label: summarizeLabel(fileName),
          mediaPath: validated.toString(),
        },
      });
      return;
    }

    const fetched = await fetchRemoteMedia(validated);
    const persisted = persistDownloadedMedia(
      home,
      fetched.mediaKind,
      category,
      fetched.fileName,
      fetched.body,
    );
    if (persisted === 'bad-category') {
      jsonError(res, 400, 'Categoria inválida');
      return;
    }
    if (persisted === 'conflict') {
      jsonError(res, 409, 'Já existe um ficheiro com este nome');
      return;
    }

    res.json({
      status: 'successo',
      mode: 'download',
      item: {
        kind: fetched.mediaKind === 'imagens' ? 'image' : 'video',
        label: summarizeLabel(fetched.fileName),
        mediaPath: persisted.rel,
        ...(persisted.thumbPath ? { thumbPath: persisted.thumbPath } : {}),
      },
    });
  } catch (err) {
    const code =
      err instanceof RemoteFetchError
        ? err.code
        : err instanceof Error && err.message === 'ssrf_blocked'
          ? 'ssrf_blocked'
          : 'fetch_failed';
    appendErrorLog({
      level: 'error',
      source: LOG_SOURCE,
      message: importUrlErrorMessage(code),
      detail: `url=${redactMediaImportUrl(rawUrl)} code=${code}`,
    });
    jsonError(res, 400, importUrlErrorMessage(code), code);
  }
}

/** Sinaliza ao `/health` e ao Electron que as rotas CAD-194 estão montadas. */
export const CAD194_QUEUE_IMPORT_READY = true;

/** Sinaliza que `POST /api/queue/import-url` (CAD-228) está disponível. */
export const CAD228_IMPORT_URL_READY = true;

function ping(_req: Request, res: Response): void {
  res.json({ status: 'successo', cad194: true });
}

const rawUpload = express.raw({ limit: '600mb', type: 'application/octet-stream' });

/** Rotas dentro de `/video` ou `/imagem` → `/video/importar/youtube`, etc. */
export function registerQueueImportRoutes(api: Router): void {
  api.get('/importar/ping', ping);
  api.post('/importar/upload', requireOperatorAccess, rawUpload, handleUpload);
  api.post('/importar/youtube', requireOperatorAccess, handleYoutube);
  api.get('/importar/youtube/jobs/:jobId', requireOperatorAccess, handleYoutubeJobStatus);
  api.post('/importar/youtube/jobs/:jobId/embed', requireOperatorAccess, handleYoutubeJobEmbed);
  api.post('/importar/youtube/jobs/:jobId/retry', requireOperatorAccess, handleYoutubeJobRetry);
  api.post('/importar/url', requireOperatorAccess, handleImportUrl);
}

/** Router para mount `/api/queue` (paths sem prefixo `importar`). */
export function createQueueImportRouter(): Router {
  const api = Router();
  api.get('/ping', ping);
  api.post('/upload', requireOperatorAccess, rawUpload, handleUpload);
  api.post('/youtube', requireOperatorAccess, handleYoutube);
  api.get('/youtube/jobs/:jobId', requireOperatorAccess, handleYoutubeJobStatus);
  api.post('/youtube/jobs/:jobId/embed', requireOperatorAccess, handleYoutubeJobEmbed);
  api.post('/youtube/jobs/:jobId/retry', requireOperatorAccess, handleYoutubeJobRetry);
  api.post('/import-url', requireOperatorAccess, handleImportUrl);
  return api;
}
