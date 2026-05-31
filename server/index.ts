import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { ensureDefaultAdmin } from '../core/auth/users.js';
import { ensureLivepraiseDataDir } from './bootstrap.js';
import { DEFAULT_PORT, getLivepraiseHome } from './config/paths.js';
import { closeMainDb, getMainDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { createBackgroundRouter, createBibleRouter } from './routes/bible.js';
import { createDisplayRouter } from './routes/display.js';
import { createDisplaysConfigRouter } from './routes/displays-config.js';
import { createImageRouter, createVideoRouter } from './routes/media.js';
import { createLocalesRouter } from './routes/locales.js';
import { createMusicRouter } from './routes/music.js';
import { createPlaylistRouter } from './routes/playlist.js';
import { createThemesRouter } from './routes/themes.js';
import { createAuthRouter } from './routes/auth.js';
import { createUsersRouter } from './routes/users.js';
import { createRemoteRouter } from './routes/remote.js';
import { createDevicesRouter } from './routes/devices.js';
import { createSystemRouter, errorLogMiddleware, registerProcessErrorHandlers } from './routes/system.js';
import {
  attachLiveWebSocket,
  LIVE_WS_PATH,
  type LiveWebSocketHub,
} from './websocket/index.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(moduleDir, '../..');

export interface LivepraiseServer {
  app: Express;
  httpServer: Server;
  port: number;
  liveHub: LiveWebSocketHub;
}

let activeServer: LivepraiseServer | null = null;

export async function prepareDatabase(): Promise<number> {
  await ensureLivepraiseDataDir();
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
  await prepareDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const home = getLivepraiseHome();
  app.use('/imagens', express.static(path.join(home, 'imagens')));
  app.use('/videos', express.static(path.join(home, 'videos')));

  app.use('/musica', createMusicRouter());
  app.use('/playlist', createPlaylistRouter());
  app.use('/biblias', createBibleRouter());
  app.use('/imagem', createImageRouter());
  app.use('/video', createVideoRouter());
  app.use('/display', createDisplayRouter());
  app.use('/displays', createDisplaysConfigRouter());
  app.use('/themes', createThemesRouter());
  app.use('/locales', createLocalesRouter());
  app.use(createBackgroundRouter());

  app.use('/api/auth', createAuthRouter());
  app.use('/api/users', createUsersRouter());
  app.use('/api/system', createSystemRouter());
  if (liveHub) {
    app.use('/api/remote', createRemoteRouter(liveHub));
  }
  app.use('/api/devices', createDevicesRouter());

  app.use(
    '/projector',
    express.static(path.join(appRoot, 'apps/projector'), {
      index: 'index.html',
    }),
  );

  app.get('/stage-return', (_req, res) => res.redirect(302, '/stage/'));
  app.get('/stage-return/', (_req, res) => res.redirect(302, '/stage/'));

  app.use(
    '/live',
    express.static(path.join(appRoot, 'web/live'), { index: 'index.html' }),
  );

  const externalDisplayRoot = path.join(appRoot, 'web/external-display');
  for (const route of ['/vocal', '/stage', '/player'] as const) {
    app.use(
      route,
      express.static(externalDisplayRoot, { index: 'index.html' }),
    );
  }

  app.use(
    '/operator',
    express.static(path.join(appRoot, 'dist/apps/operator'), {
      index: 'index.html',
    }),
  );

  app.use(
    '/remote',
    express.static(path.join(appRoot, 'web/remote'), {
      index: 'index.html',
    }),
  );

  app.use(
    '/',
    express.static(path.join(appRoot, 'web/portal'), {
      index: 'index.html',
    }),
  );

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      phase: 'fase-8-release',
      websocket: LIVE_WS_PATH,
    });
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

  const bootstrapApp = express();
  const httpServer = createServer(bootstrapApp);
  const liveHub = attachLiveWebSocket(httpServer);
  const app = await createLivepraiseApp(liveHub);

  bootstrapApp.use(app);

  await new Promise<void>((resolve) => {
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
  process.argv[1] &&
  (process.argv[1].endsWith('server/index.js') ||
    process.argv[1].endsWith('server/index.ts'));

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
