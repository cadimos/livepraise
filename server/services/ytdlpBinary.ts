import fs from 'node:fs';
import path from 'node:path';
import { getAppRoot } from '../config/paths.js';

const EXEC_NAME = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

/** Caminho do yt-dlp embutido (vendor/), com override opcional por ambiente. */
export function ytdlpBinary(): string {
  const override = process.env.YTDLP_BIN?.trim();
  if (override) return override;

  const bundled = path.join(getAppRoot(), 'vendor', 'yt-dlp', EXEC_NAME);
  if (fs.existsSync(bundled)) return bundled;

  return '';
}
