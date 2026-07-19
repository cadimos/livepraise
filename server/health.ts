import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLivepraiseHome } from './config/paths.js';
import { getMainDb } from './db/connection.js';
import { LIVE_WS_PATH } from './websocket/index.js';
import {
  CAD194_QUEUE_IMPORT_READY,
  CAD228_IMPORT_URL_READY,
} from './routes/queue-import.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.env.LIVEPRAISE_APP_ROOT
  ? path.resolve(process.env.LIVEPRAISE_APP_ROOT)
  : path.resolve(moduleDir, '../..');

export const HEALTH_PHASE = 'release';

export interface HealthModuleStatus {
  id: string;
  name: string;
  active: boolean;
  mount?: string;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  phase: string;
  version: string;
  websocket: string;
  /** Capacidades do binário em execução (deteta servidor obsoleto na mesma porta). */
  features: {
    cad194: boolean;
    cad228: boolean;
  };
  modules: HealthModuleStatus[];
}

function readAppVersion(): string {
  try {
    const raw = fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: unknown };
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function pathExists(target: string): boolean {
  try {
    return fs.existsSync(target);
  } catch {
    return false;
  }
}

function isDatabaseActive(): boolean {
  try {
    getMainDb().prepare('SELECT 1 AS ok').get();
    return true;
  } catch {
    return false;
  }
}

/** Inventário rápido de módulos montados no servidor e artefactos no disco. */
export function buildHealthReport(liveHubAttached: boolean): HealthReport {
  const home = getLivepraiseHome();
  const modules: HealthModuleStatus[] = [
    {
      id: 'database',
      name: 'Base de dados (SQLite)',
      active: isDatabaseActive(),
      mount: 'dsw.bd',
    },
    {
      id: 'websocket',
      name: 'Hub WebSocket ao vivo',
      active: liveHubAttached,
      mount: LIVE_WS_PATH,
    },
    {
      id: 'music',
      name: 'Música / letras',
      active: true,
      mount: '/musica',
    },
    {
      id: 'playlist',
      name: 'Playlist',
      active: true,
      mount: '/playlist',
    },
    {
      id: 'bible',
      name: 'Bíblia',
      active: true,
      mount: '/biblias',
    },
    {
      id: 'backgrounds',
      name: 'Fundos rápidos',
      active: true,
      mount: '/background-rapido',
    },
    {
      id: 'images',
      name: 'Imagens',
      active: true,
      mount: '/imagem',
    },
    {
      id: 'videos',
      name: 'Vídeos',
      active: true,
      mount: '/video',
    },
    {
      id: 'display',
      name: 'Projeção (display)',
      active: true,
      mount: '/display',
    },
    {
      id: 'displays',
      name: 'Configuração de monitores',
      active: true,
      mount: '/displays',
    },
    {
      id: 'themes',
      name: 'Temas',
      active: true,
      mount: '/themes',
    },
    {
      id: 'locales',
      name: 'Traduções (i18n)',
      active: true,
      mount: '/locales',
    },
    {
      id: 'auth',
      name: 'Autenticação',
      active: true,
      mount: '/api/auth',
    },
    {
      id: 'users',
      name: 'Utilizadores',
      active: true,
      mount: '/api/users',
    },
    {
      id: 'system',
      name: 'Sistema / log de erros',
      active: true,
      mount: '/api/system',
    },
    {
      id: 'remote-api',
      name: 'API remota (sincronização)',
      active: liveHubAttached,
      mount: '/api/remote',
    },
    {
      id: 'devices',
      name: 'Dispositivos externos',
      active: true,
      mount: '/api/devices',
    },
    {
      id: 'queue-import',
      name: 'Importação para fila (CAD-194 / CAD-228)',
      active: CAD228_IMPORT_URL_READY,
      mount: '/video/importar, /imagem/importar, /api/queue (+ import-url)',
    },
    {
      id: 'media-storage',
      name: 'Armazenamento de mídia local',
      active:
        pathExists(path.join(home, 'imagens')) &&
        pathExists(path.join(home, 'videos')),
      mount: '~/livepraise/{imagens,videos}',
    },
    {
      id: 'projector-ui',
      name: 'UI do projetor',
      active: pathExists(path.join(appRoot, 'dist/apps/projector')),
      mount: '/projector',
    },
    {
      id: 'operator-ui',
      name: 'UI do operador',
      active: pathExists(path.join(appRoot, 'dist/apps/operator')),
      mount: '/operator',
    },
    {
      id: 'live-portal',
      name: 'Portal live',
      active: pathExists(path.join(appRoot, 'dist/web/live')),
      mount: '/live',
    },
    {
      id: 'external-displays',
      name: 'Ecrãs externos (vocal/stage/player)',
      active: pathExists(path.join(appRoot, 'dist/web/external-display')),
      mount: '/vocal, /stage, /player',
    },
    {
      id: 'remote-ui',
      name: 'Controlo remoto (web)',
      active: pathExists(path.join(appRoot, 'dist/web/remote')),
      mount: '/remote',
    },
    {
      id: 'portal',
      name: 'Portal web',
      active: pathExists(path.join(appRoot, 'dist/web/portal')),
      mount: '/',
    },
    {
      id: 'openapi-docs',
      name: 'Documentação OpenAPI',
      active: pathExists(path.join(appRoot, 'openapi.yaml')),
      mount: '/api/docs',
    },
  ];

  const criticalInactive = modules.some(
    (m) =>
      !m.active &&
      (m.id === 'database' || m.id === 'websocket' || m.id === 'remote-api'),
  );

  return {
    status: criticalInactive ? 'degraded' : 'ok',
    phase: HEALTH_PHASE,
    version: readAppVersion(),
    websocket: LIVE_WS_PATH,
    features: {
      cad194: CAD194_QUEUE_IMPORT_READY,
      cad228: CAD228_IMPORT_URL_READY,
    },
    modules,
  };
}
