import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { appendErrorLog } from '../../core/error-log/store.js';
import { parseYouTubeVideoId } from '../../shared/youtube.js';
import { scheduleVideoPipeline } from './videoPipeline.js';
import { ytdlpBinary } from './ytdlpBinary.js';

const LOG_SOURCE = 'youtube-import';

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv)$/i;

/** Falha imediata (protegido, indisponível, yt-dlp ausente) — sem retry. */
const UNAVAILABLE_PATTERNS = [
  /private video/i,
  /video unavailable/i,
  /video is unavailable/i,
  /sign in to confirm/i,
  /members[- ]only/i,
  /join this channel/i,
  /copyright/i,
  /blocked it in your country/i,
  /HTTP Error 403/i,
  /HTTP Error 404/i,
  /Premieres in/i,
  /live event will begin/i,
  /not available/i,
  /account has been terminated/i,
  /No supported media found/i,
  /unable to download/i,
  /Requested format is not available/i,
];

export interface YoutubeImportResult {
  mode: 'local' | 'embed';
  videoId: string;
  mediaPath?: string;
  thumbPath?: string;
  label: string;
  warning?: string;
}

export interface YoutubeDownloadProgress {
  percent: number;
}

export type YoutubeDownloadFailureReason = 'unavailable' | 'interrupted';

export type YoutubeDownloadResult =
  | { ok: true; rel: string; videoId: string }
  | {
      ok: false;
      videoId: string;
      reason: YoutubeDownloadFailureReason;
      error?: string;
      progressPercent: number;
    };

export interface YtDlpRunResult {
  success: boolean;
  progressPercent: number;
  output: string;
  spawnFailed: boolean;
}

function findDownloadedFile(dir: string, videoId: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const prefix = `yt-${videoId}`;
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith(prefix) || !VIDEO_EXT_RE.test(file)) continue;
    return path.join(dir, file);
  }
  return null;
}

export function classifyYoutubeDownloadFailure(result: YtDlpRunResult): YoutubeDownloadFailureReason {
  if (result.spawnFailed) return 'unavailable';
  if (result.progressPercent > 0) return 'interrupted';
  if (UNAVAILABLE_PATTERNS.some((re) => re.test(result.output))) return 'unavailable';
  return 'unavailable';
}

export function runYtDlp(
  url: string,
  outputTemplate: string,
  onProgress?: (progress: YoutubeDownloadProgress) => void,
): Promise<YtDlpRunResult> {
  return new Promise((resolve) => {
    const binary = ytdlpBinary();
    if (!binary) {
      resolve({
        success: false,
        progressPercent: 0,
        output: 'yt-dlp embutido não encontrado',
        spawnFailed: true,
      });
      return;
    }

    let progressPercent = 0;
    let output = '';

    const proc = spawn(
      binary,
      [
        '--no-playlist',
        '--no-warnings',
        '--newline',
        '--progress',
        '-f',
        'b[ext=mp4]/b',
        '--merge-output-format',
        'mp4',
        '-o',
        outputTemplate,
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const handleChunk = (chunk: Buffer) => {
      const text = chunk.toString();
      output += text;
      const match = text.match(/\[download\]\s+(\d+(?:\.\d+)?)%/);
      if (match) {
        progressPercent = Math.max(progressPercent, Number(match[1]));
        onProgress?.({ percent: progressPercent });
      }
    };

    proc.stdout?.on('data', handleChunk);
    proc.stderr?.on('data', handleChunk);
    proc.on('error', () => {
      resolve({ success: false, progressPercent, output, spawnFailed: true });
    });
    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        progressPercent,
        output,
        spawnFailed: false,
      });
    });
  });
}

/** Verifica rapidamente se o yt-dlp consegue obter o vídeo (sem descarregar). */
export function probeYoutubeDownloadAvailable(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const binary = ytdlpBinary();
    if (!binary) {
      resolve(false);
      return;
    }
    const proc = spawn(
      binary,
      ['--no-playlist', '--simulate', '--no-warnings', url],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

function removePartialDownloads(catDir: string, videoId: string): void {
  if (!fs.existsSync(catDir)) return;
  const prefix = `yt-${videoId}`;
  for (const file of fs.readdirSync(catDir)) {
    if (file.startsWith(prefix)) {
      try {
        fs.unlinkSync(path.join(catDir, file));
      } catch {
        /* ignore */
      }
    }
  }
}

/** Descarrega um vídeo YouTube para a biblioteca local. */
export async function downloadYoutubeVideo(
  home: string,
  url: string,
  category: string,
  onProgress?: (progress: YoutubeDownloadProgress) => void,
  options?: { cleanPartials?: boolean },
): Promise<YoutubeDownloadResult> {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) {
    return {
      ok: false,
      videoId: '',
      reason: 'unavailable',
      error: 'URL YouTube inválida',
      progressPercent: 0,
    };
  }

  const catDir = path.join(home, 'videos', category);
  if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

  if (options?.cleanPartials) {
    removePartialDownloads(catDir, videoId);
  }

  const outputTemplate = path.join(catDir, `yt-${videoId}.%(ext)s`);
  const run = await runYtDlp(url, outputTemplate, onProgress);
  const absFile = findDownloadedFile(catDir, videoId);

  if (run.success && absFile) {
    const rel = absFile.replace(home + path.sep, '').replaceAll('\\', '/');
    return { ok: true, rel, videoId };
  }

  const reason = classifyYoutubeDownloadFailure(run);
  const errorLine =
    run.output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .find((line) => /ERROR:|error:/i.test(line)) ??
    run.output.trim().split('\n').pop()?.trim();

  return {
    ok: false,
    videoId,
    reason,
    error: run.spawnFailed
      ? 'yt-dlp embutido não disponível nesta plataforma'
      : errorLine || undefined,
    progressPercent: run.progressPercent,
  };
}

export async function importYoutubeToLibrary(
  home: string,
  url: string,
  category: string,
): Promise<YoutubeImportResult | null> {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) return null;

  const label = `YouTube ${videoId}`;
  const downloaded = await downloadYoutubeVideo(home, url, category);

  if (downloaded.ok) {
    scheduleVideoPipeline(home, downloaded.rel);
    const base = path.basename(downloaded.rel, path.extname(downloaded.rel));
    const thumbRel = `videos/${category}/thumb/${base}.jpg`;
    appendErrorLog({
      level: 'warn',
      source: LOG_SOURCE,
      message: `YouTube ${videoId}: download local concluído (modo local)`,
      detail: `mediaPath=${downloaded.rel}`,
    });
    return {
      mode: 'local',
      videoId,
      mediaPath: downloaded.rel,
      thumbPath: fs.existsSync(path.join(home, thumbRel)) ? thumbRel : '',
      label,
    };
  }

  const embedWarning =
    downloaded.reason === 'interrupted'
      ? 'O download foi interrompido. Pode tentar de novo ou usar embed do YouTube.'
      : 'Não foi possível descarregar o vídeo (protegido ou indisponível). Será usado embed — pode travar com internet instável.';
  appendErrorLog({
    level: 'warn',
    source: LOG_SOURCE,
    message: `YouTube ${videoId}: fallback para embed (${downloaded.reason})`,
    detail: downloaded.error ?? `progress=${downloaded.progressPercent}%`,
  });

  return {
    mode: 'embed',
    videoId,
    label,
    warning: embedWarning,
  };
}
