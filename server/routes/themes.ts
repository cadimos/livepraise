import { Router } from 'express';
import path from 'node:path';
import { isSafePathSegment } from '../../core/security/safe-segment.js';
import {
  listThemes,
  resolveTheme,
  resolveThemeAssetsDir,
} from '../../core/themes/resolve.js';
import { cssVariablesBlock } from '../../core/themes/css-vars.js';

export function createThemesRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'successo', items: listThemes() });
  });

  router.get('/:themeId/theme.json', (req, res) => {
    if (!isSafePathSegment(req.params.themeId)) {
      res.status(400).json({ status: 'erro', message: 'Identificador de tema inválido' });
      return;
    }

    const theme = resolveTheme(req.params.themeId);
    if (!theme) {
      res.status(404).json({ status: 'erro', message: 'Tema não encontrado' });
      return;
    }
    res.json(theme);
  });

  router.get('/:themeId/variables.css', (req, res) => {
    if (!isSafePathSegment(req.params.themeId)) {
      res.status(400).type('text/plain').send('/* identificador de tema inválido */');
      return;
    }

    const theme = resolveTheme(req.params.themeId);
    if (!theme) {
      res.status(404).type('text/plain').send('/* tema não encontrado */');
      return;
    }
    res.type('text/css').send(cssVariablesBlock(theme));
  });

  router.get('/:themeId/assets/:filename', (req, res) => {
    if (!isSafePathSegment(req.params.themeId)) {
      res.status(400).end();
      return;
    }

    const assetsDir = resolveThemeAssetsDir(req.params.themeId);
    if (!assetsDir) {
      res.status(404).end();
      return;
    }

    const filePath = path.normalize(path.join(assetsDir, req.params.filename));
    if (!filePath.startsWith(path.normalize(assetsDir + path.sep))) {
      res.status(403).end();
      return;
    }

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  });

  return router;
}
