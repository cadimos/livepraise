import { Router, type Request, type Response } from 'express';
import {
  loadProjectionTypographyPrefs,
  saveProjectionTypographyPrefs,
} from '../../core/projection-typography/persistence.js';
import { sanitizeProjectionTypographyPrefs } from '../../shared/projection-typography.js';
import { getLivepraiseHome } from '../config/paths.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import type { LiveWebSocketHub } from '../websocket/index.js';

export function createProjectionTypographyRouter(
  liveHub?: LiveWebSocketHub,
): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const projectionTypography = loadProjectionTypographyPrefs(getLivepraiseHome());
    res.json({ status: 'ok', projectionTypography });
  });

  router.put('/', requireOperatorAccess, (req: Request, res: Response) => {
    const body = req.body as { projectionTypography?: unknown };
    const projectionTypography = sanitizeProjectionTypographyPrefs(
      body?.projectionTypography,
    );
    saveProjectionTypographyPrefs(getLivepraiseHome(), projectionTypography);
    liveHub?.broadcastProjectionTypography(projectionTypography);
    res.json({ status: 'ok', projectionTypography });
  });

  return router;
}
