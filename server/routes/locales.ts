import { Router } from 'express';
import { isSafePathSegment } from '../../core/security/safe-segment.js';
import { listLocales, resolveLocale } from '../../core/locales/resolve.js';

export function createLocalesRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ status: 'successo', items: listLocales(), default: 'pt-BR' });
  });

  router.get('/:locale.json', (req, res) => {
    const locale = req.params.locale.replace(/\.json$/, '');
    if (!isSafePathSegment(locale)) {
      res.status(400).json({ status: 'erro', message: 'Locale inválido' });
      return;
    }

    const messages = resolveLocale(locale);
    if (!messages) {
      res.status(404).json({ status: 'erro', message: 'Locale não encontrado' });
      return;
    }
    res.json(messages);
  });

  return router;
}
