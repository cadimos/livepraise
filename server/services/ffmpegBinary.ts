import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';

const pkgPath =
  typeof ffmpegStatic === 'string'
    ? ffmpegStatic
    : (ffmpegStatic as { default?: string }).default;

function siblingCandidates(binPath: string): string[] {
  const dir = path.dirname(binPath);
  const ext = path.extname(binPath);
  const base = path.basename(binPath, ext);
  return [
    binPath,
    path.join(dir, `${base}.exe`),
    path.join(dir, base),
  ];
}

function pathFfmpeg(): string | null {
  if (process.platform === 'win32') {
    const found = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
    if (found.status === 0) {
      const line = found.stdout.split(/\r?\n/).find((l) => l.trim());
      if (line && fs.existsSync(line.trim())) return line.trim();
    }
    return null;
  }
  const found = spawnSync('sh', ['-c', 'command -v ffmpeg'], { encoding: 'utf8' });
  const line = found.stdout.trim();
  return line && fs.existsSync(line) ? line : null;
}

/** Resolve ffmpeg embutido (ffmpeg-static) ou do PATH; lança se indisponível. */
export function resolveFfmpegBinary(): string {
  const tried: string[] = [];

  if (process.env.FFMPEG_BIN?.trim()) {
    const envBin = process.env.FFMPEG_BIN.trim();
    tried.push(envBin);
    if (fs.existsSync(envBin)) return envBin;
  }

  if (pkgPath) {
    for (const candidate of siblingCandidates(pkgPath)) {
      if (tried.includes(candidate)) continue;
      tried.push(candidate);
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  const system = pathFfmpeg();
  if (system) return system;

  throw new Error(
    `ffmpeg não encontrado (tentativas: ${tried.join(', ') || 'nenhuma'}). ` +
      'Execute npm install ou node scripts/install-ffmpeg.mjs',
  );
}

export function ffmpegDebugEnabled(): boolean {
  return process.env.LIVEPRAISE_DEBUG === '1' || process.env.LIVEPRAISE_DEBUG_FFMPEG === '1';
}

export function logFfmpeg(message: string, detail?: string): void {
  const suffix = detail ? ` ${detail}` : '';
  console.info(`[ffmpeg] ${message}${suffix}`);
}
