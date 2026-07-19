import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { ensureDefaultAdmin } from '../core/auth/users.js';
import { ensureLivepraiseDataDir } from './bootstrap.js';
import { syncBundledFontsToHome } from '../core/fonts/sync.js';
import { syncBundledThemesToHome } from '../core/themes/sync.js';
import { DEFAULT_PORT, getDatabasePath, getLivepraiseHome } from './config/paths.js';
import { closeMainDb, getMainDb } from './db/connection.js';
import {
  databaseWasQuarantined,
  prepareLegacyDatabaseFile,
} from './db/legacy-upgrade.js';
import { bootstrapEmptyDatabase, runMigrations } from './db/migrate.js';
import { createBackgroundRouter, createBibleRouter } from './routes/bible.js';
import { createDisplayRouter } from './routes/display.js';
import { createDisplaysConfigRouter } from './routes/displays-config.js';
import { createImageRouter, createVideoRouter } from './routes/media.js';
import { createQueueImportRouter } from './routes/queue-import.js';
import { createLocalesRouter } from './routes/locales.js';
import { createMusicRouter } from './routes/music.js';
import { createPlaylistRouter } from './routes/playlist.js';
import { createThemesRouter } from './routes/themes.js';
import { createAuthRouter } from './routes/auth.js';
import { createUsersRouter } from './routes/users.js';
import { createRemoteRouter } from './routes/remote.js';
import { createDevicesRouter } from './routes/devices.js';
import { createBackupRouter, createRestoreRouter } from './routes/backup.js';
import { createAuditRouter } from './routes/audit.js';
import { startRetentionScheduler, stopRetentionScheduler } from './retention-scheduler.js';
import { startVideoWatcher, stopVideoWatcher } from './services/videoWatcher.js';
import { backupModeGuard } from './middleware/backup-mode.js';
import { createFontsRouter } from './routes/fonts.js';
import { createProjectionTypographyRouter } from './routes/projection-typography.js';
import { createSystemRouter, errorLogMiddleware, registerProcessErrorHandlers } from './routes/system.js';
import { buildHealthReport } from './health.js';
import {
  attachLiveWebSocket,
  LIVE_WS_PATH,
  type LiveWebSocketHub,
} from './websocket/index.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.env.LIVEPRAISE_APP_ROOT
  ? path.resolve(process.env.LIVEPRAISE_APP_ROOT)
  : path.resolve(moduleDir, '../..');

export interface LivepraiseServer {
  app: Express;
  httpServer: Server;
  port: number;
  liveHub: LiveWebSocketHub;
}

let activeServer: LivepraiseServer | null = null;

export async function prepareDatabase(): Promise<number> {
  await ensureLivepraiseDataDir();
  prepareLegacyDatabaseFile();
  if (databaseWasQuarantined()) {
    bootstrapEmptyDatabase(getDatabasePath());
  }
  await syncBundledThemesToHome();
  await syncBundledFontsToHome();
  const applied = runMigrations();
  const bootstrap = ensureDefaultAdmin(getMainDb());
  if (bootstrap) {
    console.warn(
      `[livepraise] Admin inicial criado: ${bootstrap.username} / ${bootstrap.password}`,
    );
  }
  return applied;
}

export async function createLivepraiseApp(
  liveHub?: LiveWebSocketHub,
): Promise<Express> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: false }));
  app.use(backupModeGuard);

  const home = getLivepraiseHome();
  const iconRoot = path.join(appRoot, 'resources', 'icon');

  app.get('/favicon.ico', (_req, res) => {
    res.sendFile(path.join(iconRoot, 'livepraise.ico'));
  });
  app.get(['/icon.png', '/apple-touch-icon.png'], (_req, res) => {
    res.type('png').sendFile(path.join(iconRoot, 'livepraise.png'));
  });

  app.use('/fonts', createFontsRouter());
  app.use('/imagens', express.static(path.join(home, 'imagens')));
  app.use('/videos', express.static(path.join(home, 'videos')));

  app.use('/musica', createMusicRouter());
  app.use('/playlist', createPlaylistRouter());
  app.use('/biblias', createBibleRouter());
  const queueImportRouter = createQueueImportRouter();
  app.use('/api/queue', queueImportRouter);
  app.use('/imagem', createImageRouter());
  app.use('/video', createVideoRouter());
  app.use('/display', createDisplayRouter());
  app.use('/displays', createDisplaysConfigRouter(liveHub));
  app.use('/themes', createThemesRouter());
  app.use('/locales', createLocalesRouter());
  app.use(createBackgroundRouter());

  app.use('/api/auth', createAuthRouter());
  app.use('/api/users', createUsersRouter());
  app.use('/api/system', createSystemRouter());
  app.use('/api/projection-typography', createProjectionTypographyRouter(liveHub));
  if (liveHub) {
    app.use('/api/remote', createRemoteRouter(liveHub));
  }
  app.use('/api/devices', createDevicesRouter());
  app.use('/api/backup', createBackupRouter());
  app.use('/api/restore', createRestoreRouter());
  app.use('/api/audit', createAuditRouter());

  app.get('/api/health', (_req, res) => {
    res.json(buildHealthReport(Boolean(liveHub)));
  });

  const projectorRoot = path.join(appRoot, 'dist/apps/projector');
  app.get(['/projector', '/projector/'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.sendFile(path.join(projectorRoot, 'index.html'));
  });
  app.use(
    '/projector',
    (req, res, next) => {
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      next();
    },
    express.static(projectorRoot, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }),
  );

  app.get('/stage-return', (_req, res) => res.redirect(302, '/stage/'));
  app.get('/stage-return/', (_req, res) => res.redirect(302, '/stage/'));

  app.use(
    '/shared',
    express.static(path.join(appRoot, 'dist', 'shared'), {
      setHeaders(res, filePath) {
        if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }),
  );

  const externalDisplayRoot = path.join(appRoot, 'dist/web/external-display');

  const publicViewerRoutes = [
    { mount: '/live', root: path.join(appRoot, 'dist/web/live') },
    { mount: '/vocal', root: externalDisplayRoot },
    { mount: '/stage', root: externalDisplayRoot },
    { mount: '/player', root: externalDisplayRoot },
  ] as const;

  for (const { mount, root } of publicViewerRoutes) {
    app.get([mount, `${mount}/`], (req, res) => {
      if (!req.path.endsWith('/')) {
        res.redirect(302, `${mount}/`);
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.sendFile(path.join(root, 'index.html'));
    });
    app.use(
      mount,
      (req, res, next) => {
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
      },
      express.static(root, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-store');
          }
        },
      }),
    );
  }

  const operatorRoot = path.join(appRoot, 'dist/apps/operator');
  app.get(['/operator', '/operator/'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(operatorRoot, 'index.html'));
  });
  app.use(
    '/operator',
    express.static(operatorRoot, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store');
        }
      },
    }),
  );

  app.use(
    '/remote',
    express.static(path.join(appRoot, 'dist/web/remote'), {
      index: 'index.html',
    }),
  );

  app.use(
    '/',
    express.static(path.join(appRoot, 'dist/web/portal'), {
      index: 'index.html',
    }),
  );

  app.get('/health', (_req, res) => {
    res.json(buildHealthReport(Boolean(liveHub)));
  });

  const openApiPath = path.join(appRoot, 'openapi.yaml');
  app.get('/api/docs/openapi.yaml', (_req, res) => {
    res.type('application/yaml').sendFile(openApiPath);
  });

  app.get('/api/docs', (_req, res) => {
    res.type('text/html').send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Livepraise API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
    });
  </script>
</body>
</html>`);
  });

  app.use(errorLogMiddleware());

  return app;
}

export async function startLivepraiseServer(
  port = DEFAULT_PORT,
): Promise<LivepraiseServer> {
  if (activeServer) return activeServer;

  registerProcessErrorHandlers();
  await prepareDatabase();
  startRetentionScheduler();

  const bootstrapApp = express();
  const httpServer = createServer(bootstrapApp);
  const liveHub = attachLiveWebSocket(httpServer);
  startVideoWatcher(liveHub);
  const app = await createLivepraiseApp(liveHub);

  bootstrapApp.use(app);

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Porta ${port} já em uso. Encerre outro processo Livepraise (ou node dist/server/index.js) antes de reiniciar.`,
          ),
        );
        return;
      }
      reject(err);
    });
    httpServer.listen(port, () => resolve());
  });

  const address = httpServer.address();
  const actualPort =
    typeof address === 'object' && address !== null ? address.port : port;

  activeServer = { app, httpServer, port: actualPort, liveHub };
  return activeServer;
}

export async function stopLivepraiseServer(): Promise<void> {
  if (!activeServer) return;

  stopRetentionScheduler();
  stopVideoWatcher();
  await activeServer.liveHub.close();

  await new Promise<void>((resolve, reject) => {
    activeServer!.httpServer.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  closeMainDb();
  activeServer = null;
}

const isDirectRun =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.join(moduleDir, 'index.js');

if (isDirectRun) {
  startLivepraiseServer()
    .then(({ port }) => {
      console.log(`Livepraise server listening on http://localhost:${port}`);
      console.log(`WebSocket live hub: ws://localhost:${port}${LIVE_WS_PATH}`);
    })
    .catch((err: unknown) => {
      console.error('Failed to start Livepraise server:', err);
      process.exit(1);
    });
}
