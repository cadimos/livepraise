import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { LiveAction } from '../../shared/types/live.js';
import { sanitizeLiveAction } from '../projection/index.js';
import { isPersistedProjectionBackgroundAction } from './projection-background.js';

function livepraiseHome(): string {
  return path.join(process.env.LIVEPRAISE_HOME ?? os.homedir(), 'livepraise');
}

function snapshotPath(): string {
  return path.join(livepraiseHome(), 'projection-background.json');
}

export function loadPersistedProjectionBackground(): LiveAction | null {
  const file = snapshotPath();
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as {
      lastBackground?: LiveAction;
    };
    const action = parsed.lastBackground;
    if (!action || typeof action !== 'object') return null;
    return sanitizeLiveAction(action);
  } catch {
    return null;
  }
}

export function savePersistedProjectionBackground(action: LiveAction): void {
  if (!isPersistedProjectionBackgroundAction(action)) return;
  const sanitized = sanitizeLiveAction(action);
  if (!sanitized) return;
  const file = snapshotPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ version: 1, lastBackground: sanitized }, null, 2),
    'utf8',
  );
}

export function clearPersistedProjectionBackground(): void {
  const file = snapshotPath();
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}
