import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  ffmpegDebugEnabled,
  logFfmpeg,
  resolveFfmpegBinary,
} from './ffmpegBinary.js';

export type VideoPipelineStatus = 'ready' | 'processing' | 'error';

export interface VideoPipelineState {
  status: VideoPipelineStatus;
  percent: number;
  error?: string;
}

const jobs = new Map<string, VideoPipelineState>();
const running = new Set<string>();

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|ogv|avi|mpg|mpeg|mkv)$/i;

/** Chave estável por categoria+nome-base (evita jobs duplicados após conversão). */
function jobKey(relativePath: string): string {
  const normalized = relativePath.replaceAll('\\', '/');
  const parts = normalized.split('/');
  const fileName = parts.pop() ?? '';
  const category = parts.pop() ?? '';
  const base = fileName.replace(/\.[^.]+$/, '');
  return `videos/${category}/${base}`;
}

function ffmpegBinary(): string {
  return resolveFfmpegBinary();
}

function logPipeline(message: string, detail?: string): void {
  console.info(`[video-pipeline] ${message}${detail ? ` ${detail}` : ''}`);
}

export function thumbRelPath(relativeVideo: string): string {
  const key = jobKey(relativeVideo);
  const parts = key.split('/');
  const base = parts.pop() ?? 'frame';
  const category = parts.pop() ?? '';
  return `videos/${category}/thumb/${base}.jpg`;
}

function parseFfmpegPercent(stderrChunk: string): number | null {
  const match = stderrChunk.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const current = hours * 3600 + minutes * 60 + seconds;
  return Math.min(99, Math.round(current * 10));
}

function runFfmpeg(args: string[], onProgress?: (percent: number) => void): Promise<void> {
  const bin = ffmpegBinary();
  if (ffmpegDebugEnabled()) {
    logFfmpeg('exec', `${bin} ${args.join(' ')}`);
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
    let stderr = '';
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
      const pct = parseFfmpegPercent(stderr);
      if (pct !== null && onProgress) onProgress(pct);
    });
    proc.on('error', (err) => {
      logFfmpeg('spawn error', err.message);
      reject(err);
    });
    proc.on('close', (code) => {
      if (code === 0) {
        if (ffmpegDebugEnabled()) logFfmpeg('done', `exit 0`);
        resolve();
        return;
      }
      const tail = stderr.trim().split('\n').slice(-8).join('\n');
      logFfmpeg('failed', `exit ${code}\n${tail}`);
      reject(new Error(tail || `ffmpeg exit ${code}`));
    });
  });
}

async function ensureThumb(
  absVideo: string,
  absThumb: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const thumbDir = path.dirname(absThumb);
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });
  await runFfmpeg(
    [
      '-y',
      '-i',
      absVideo,
      '-vf',
      'scale=400:-1',
      '-frames:v',
      '1',
      absThumb,
    ],
    onProgress,
  );
}

async function convertToMp4(
  absInput: string,
  absOutput: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await runFfmpeg(
    [
      '-y',
      '-i',
      absInput,
      '-f',
      'mp4',
      '-vcodec',
      'libx264',
      '-preset',
      'fast',
      '-profile:v',
      'main',
      '-acodec',
      'aac',
      absOutput,
      '-hide_banner',
    ],
    onProgress,
  );
}

function setJob(relativePath: string, state: VideoPipelineState): void {
  jobs.set(jobKey(relativePath), state);
}

export function getVideoPipelineState(relativePath: string): VideoPipelineState {
  return jobs.get(jobKey(relativePath)) ?? { status: 'ready', percent: 100 };
}

export function scheduleVideoPipeline(
  home: string,
  relativePath: string,
): string {
  const key = jobKey(relativePath);
  if (!VIDEO_EXT_RE.test(relativePath)) return key;
  if (running.has(key)) return key;

  const rel = relativePath.replaceAll('\\', '/');
  const abs = path.join(home, rel);
  if (!fs.existsSync(abs)) return key;

  const ext = path.extname(abs).toLowerCase();
  const thumbRel = thumbRelPath(rel);
  const thumbAbs = path.join(home, thumbRel);
  const needsMp4 = ext !== '.mp4';
  const needsThumb = !fs.existsSync(thumbAbs);

  if (!needsMp4 && !needsThumb) {
    setJob(rel, { status: 'ready', percent: 100 });
    return key;
  }

  const existing = jobs.get(key);
  if (existing?.status === 'processing') return key;

  setJob(rel, { status: 'processing', percent: 0 });
  running.add(key);

  logPipeline('início', `${rel} mp4=${needsMp4} thumb=${needsThumb} ffmpeg=${ffmpegBinary()}`);

  void (async () => {
    try {
      let workingRel = rel;
      let workingAbs = abs;

      if (needsMp4) {
        const mp4Rel = rel.replace(/\.[^.]+$/i, '.mp4');
        const mp4Abs = path.join(home, mp4Rel);
        logPipeline('convertendo', `${workingRel} → ${mp4Rel}`);
        await convertToMp4(workingAbs, mp4Abs, (pct) => {
          setJob(workingRel, { status: 'processing', percent: Math.floor(pct * 0.7) });
        });
        fs.unlinkSync(workingAbs);
        workingRel = mp4Rel;
        workingAbs = mp4Abs;
        setJob(workingRel, { status: 'processing', percent: 70 });
      }

      if (!fs.existsSync(thumbAbs)) {
        logPipeline('miniatura', `${workingRel} → ${thumbRel}`);
        await ensureThumb(workingAbs, thumbAbs, (pct) => {
          setJob(workingRel, {
            status: 'processing',
            percent: needsMp4 ? 70 + Math.floor(pct * 0.3) : pct,
          });
        });
      }

      setJob(workingRel, { status: 'ready', percent: 100 });
      logPipeline('concluído', workingRel);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setJob(rel, { status: 'error', percent: 0, error: message });
      logPipeline('erro', `${rel}: ${message}`);
    } finally {
      running.delete(key);
    }
  })();

  return key;
}

export function resetVideoPipelineForTests(): void {
  jobs.clear();
  running.clear();
}

export function setVideoPipelineStateForTests(
  relativePath: string,
  state: VideoPipelineState,
): void {
  setJob(relativePath, state);
}
