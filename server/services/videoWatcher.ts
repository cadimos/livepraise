import fs from 'node:fs';
import path from 'node:path';
import { getLivepraiseHome } from '../config/paths.js';
import type { LiveWebSocketHub } from '../websocket/live-hub.js';
import { scheduleVideoPipeline } from './videoPipeline.js';

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|avi|mpg|mpeg|mkv)$/i;
const IGNORE_SUFFIX_RE = /\.(part|tmp)$/i;
const DEBOUNCE_MS = 500;

let rootWatcher: fs.FSWatcher | null = null;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
let notifyHub: LiveWebSocketHub | null = null;

function shouldIgnoreFile(fileName: string): boolean {
  if (!fileName || fileName === 'thumb') return true;
  if (IGNORE_SUFFIX_RE.test(fileName)) return true;
  return !VIDEO_EXT_RE.test(fileName);
}

function parseRelativeVideoPath(relative: string): { category: string; fileName: string } | null {
  const normalized = relative.replaceAll('\\', '/').replace(/^\/+/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.includes('thumb')) return null;
  if (parts.length < 2) return null;

  const fileName = parts[parts.length - 1]!;
  const category = parts[parts.length - 2]!;
  if (shouldIgnoreFile(fileName)) return null;
  return { category, fileName };
}

function notifyOperators(category: string, relPath: string): void {
  notifyHub?.broadcastMediaUpdated({
    kind: 'videos',
    category,
    path: relPath,
  });
}

function handleVideoReady(category: string, fileName: string): void {
  const home = getLivepraiseHome();
  const rel = `videos/${category}/${fileName}`.replaceAll('\\', '/');
  const abs = path.join(home, rel);

  try {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return;
  } catch {
    return;
  }

  scheduleVideoPipeline(home, rel);
  notifyOperators(category, rel);
}

function scheduleHandle(relative: string): void {
  const parsed = parseRelativeVideoPath(relative);
  if (!parsed) return;

  const key = `${parsed.category}/${parsed.fileName}`;
  const pending = debounceTimers.get(key);
  if (pending) clearTimeout(pending);

  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);
      handleVideoReady(parsed.category, parsed.fileName);
    }, DEBOUNCE_MS),
  );
}

function onWatchEvent(_eventType: string, filename: string | Buffer | null): void {
  if (!filename) return;
  scheduleHandle(filename.toString());
}

/**
 * O ReadDirectoryChangesW reporta nomes longos, mas um watcher aberto num caminho
 * curto 8.3 (ex.: C:\Users\RUNNER~1\…) mantém a forma curta. O libuv compara os
 * prefixos e aborta o processo quando divergem — assert nativo, logo impossível de
 * apanhar com try/catch. Em POSIX não se resolve, porque realpath também colapsa
 * symlinks (/var → /private/var) e isso mudaria o comportamento.
 */
function toWatchablePath(dir: string): string {
  if (process.platform !== 'win32') return dir;
  try {
    return fs.realpathSync.native(dir);
  } catch {
    return dir;
  }
}

export function startVideoWatcher(hub: LiveWebSocketHub | null = null): void {
  stopVideoWatcher();
  notifyHub = hub;

  const home = getLivepraiseHome();
  const videosRoot = path.join(home, 'videos');
  if (!fs.existsSync(videosRoot)) {
    fs.mkdirSync(videosRoot, { recursive: true });
  }

  try {
    rootWatcher = fs.watch(toWatchablePath(videosRoot), { recursive: true }, onWatchEvent);
    rootWatcher.on('error', (err) => {
      console.warn('[video-watcher] erro no watcher:', err);
    });
  } catch (err) {
    console.warn('[video-watcher] não foi possível iniciar fs.watch:', err);
  }
}

export function stopVideoWatcher(): void {
  for (const timer of debounceTimers.values()) {
    clearTimeout(timer);
  }
  debounceTimers.clear();

  if (rootWatcher) {
    rootWatcher.close();
    rootWatcher = null;
  }
  notifyHub = null;
}

/** Expõe debounce para smoke/tests (sem fs.watch). */
export function handleVideoWatcherPathForTests(relative: string): void {
  scheduleHandle(relative);
}

export function resetVideoWatcherForTests(): void {
  stopVideoWatcher();
}
