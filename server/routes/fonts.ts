import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontContentType } from '../../core/fonts/content-type.js';
import { resolveBundledFontPath } from '../../core/security/bundled-font.js';
import { getLivepraiseHome } from '../config/paths.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.env.LIVEPRAISE_APP_ROOT
  ? path.resolve(process.env.LIVEPRAISE_APP_ROOT)
  : path.resolve(moduleDir, '../../..');
const manifestPath = path.join(appRoot, 'resources/fonts/manifest.json');

export function createFontsRouter(): Router {
  const router = Router();

  router.get('/manifest.json', (_req: Request, res: Response) => {
    if (!fs.existsSync(manifestPath)) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.sendFile(manifestPath);
  });

  router.get('/:familia/:fileName', (req: Request, res: Response) => {
    const familia = String(req.params.familia ?? '');
    const fileName = String(req.params.fileName ?? '');
    const resolved = resolveBundledFontPath(getLivepraiseHome(), familia, fileName);
    if (!resolved) {
      res.status(404).end();
      return;
    }

    res.setHeader('Content-Type', fontContentType(fileName));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    res.sendFile(resolved, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  return router;
}
