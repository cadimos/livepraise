import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appendErrorLog } from '../../core/error-log/store.js';
import { videoThumbRelativePath } from '../../shared/queue-items.js';
import { parseYouTubeVideoId } from '../../shared/youtube.js';
import {
  downloadYoutubeVideo,
  probeYoutubeDownloadAvailable,
  type YoutubeDownloadProgress,
} from './youtubeImport.js';
import { getVideoPipelineState, scheduleVideoPipeline } from './videoPipeline.js';

const LOG_SOURCE = 'youtube-import';
/** Retry só quando o download chegou a iniciar e foi interrompido. */
export const YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS = 3;

export type YoutubeImportJobPhase =
  | 'downloading'
  | 'processing'
  | 'ready'
  | 'failed';

export interface YoutubeImportJobItem {
  kind: 'video';
  label: string;
  mediaPath?: string;
  thumbPath?: string;
  youtubeVideoId?: string;
  previewVideoId?: string;
  youtubeImportJobId?: string;
  youtubeImportPhase?: YoutubeImportJobPhase;
  youtubeImportProgress?: number;
  youtubeImportAttempt?: number;
  youtubeImportMaxAttempts?: number;
  youtubeImportError?: string;
}

export interface YoutubeImportJobSnapshot {
  jobId: string;
  videoId: string;
  phase: YoutubeImportJobPhase;
  progress: number;
  attempt: number;
  maxAttempts: number;
  error?: string;
  mode?: 'local' | 'embed';
  item?: YoutubeImportJobItem;
}

interface YoutubeImportJob {
  jobId: string;
  url: string;
  videoId: string;
  category: string;
  home: string;
  phase: YoutubeImportJobPhase;
  progress: number;
  attempt: number;
  maxAttempts: number;
  error?: string;
  mode?: 'local' | 'embed';
  mediaPath?: string;
  thumbPath?: string;
  running: boolean;
}

const jobs = new Map<string, YoutubeImportJob>();

type JobAttemptOutcome = 'success' | 'unavailable' | 'interrupted' | 'processing_failed';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPendingItem(job: YoutubeImportJob): YoutubeImportJobItem {
  return {
    kind: 'video',
    label: `YouTube ${job.videoId}`,
    previewVideoId: job.videoId,
    youtubeImportJobId: job.jobId,
    youtubeImportPhase: job.phase === 'ready' || job.phase === 'failed' ? job.phase : job.phase,
    youtubeImportProgress: job.progress,
    youtubeImportAttempt: job.attempt,
    youtubeImportMaxAttempts: job.maxAttempts,
    youtubeImportError: job.error,
  };
}

function buildReadyItem(job: YoutubeImportJob): YoutubeImportJobItem {
  if (job.mode === 'embed') {
    return {
      kind: 'video',
      label: `YouTube ${job.videoId}`,
      previewVideoId: job.videoId,
      youtubeVideoId: job.videoId,
    };
  }
  return {
    kind: 'video',
    label: `YouTube ${job.videoId}`,
    mediaPath: job.mediaPath,
    previewVideoId: job.videoId,
  };
}

export function snapshotYoutubeImportJob(jobId: string): YoutubeImportJobSnapshot | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  const base = {
    jobId: job.jobId,
    videoId: job.videoId,
    phase: job.phase,
    progress: job.progress,
    attempt: job.attempt,
    maxAttempts: job.maxAttempts,
    error: job.error,
    mode: job.mode,
  };
  if (job.phase === 'ready') {
    return { ...base, item: buildReadyItem(job) };
  }
  if (job.phase === 'failed') {
    return {
      ...base,
      item: {
        ...buildPendingItem(job),
        youtubeImportPhase: 'failed',
      },
    };
  }
  return { ...base, item: buildPendingItem(job) };
}

async function waitForVideoPipeline(
  home: string,
  rel: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  scheduleVideoPipeline(home, rel);
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const state = getVideoPipelineState(rel);
    if (state.status === 'ready') {
      onProgress(100);
      return;
    }
    if (state.status === 'error') {
      throw new Error(state.error ?? 'Falha ao gerar miniatura do vídeo');
    }
    onProgress(80 + Math.floor(state.percent * 0.2));
    await sleep(400);
  }
  throw new Error('Tempo esgotado ao preparar o vídeo');
}

async function runJobAttempt(job: YoutubeImportJob): Promise<JobAttemptOutcome> {
  job.phase = 'downloading';
  job.progress = 0;
  job.error = undefined;

  const onProgress = (update: YoutubeDownloadProgress) => {
    job.phase = 'downloading';
    job.progress = Math.min(80, Math.round(update.percent * 0.8));
  };

  const downloaded = await downloadYoutubeVideo(
    job.home,
    job.url,
    job.category,
    onProgress,
    { cleanPartials: job.attempt > 1 },
  );

  if (!downloaded.ok) {
    job.error =
      downloaded.reason === 'unavailable'
        ? downloaded.error ??
          'Vídeo protegido ou indisponível para download local.'
        : downloaded.error ??
          `Download interrompido (${Math.round(downloaded.progressPercent)}%).`;
    job.maxAttempts =
      downloaded.reason === 'unavailable'
        ? job.attempt
        : YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS;
    return downloaded.reason;
  }

  job.phase = 'processing';
  job.progress = 82;

  try {
    await waitForVideoPipeline(job.home, downloaded.rel, (pct) => {
      job.phase = 'processing';
      job.progress = pct;
    });
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    job.maxAttempts = YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS;
    return 'processing_failed';
  }

  const thumbRel = videoThumbRelativePath(downloaded.rel);
  job.mediaPath = downloaded.rel;
  job.thumbPath =
    thumbRel && fs.existsSync(path.join(job.home, thumbRel)) ? thumbRel : '';
  job.mode = 'local';
  job.phase = 'ready';
  job.progress = 100;

  appendErrorLog({
    level: 'warn',
    source: LOG_SOURCE,
    message: `YouTube ${job.videoId}: download local concluído (modo local)`,
    detail: `mediaPath=${downloaded.rel}; attempt=${job.attempt}`,
  });

  return 'success';
}

async function runJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job || job.running) return;
  job.running = true;

  try {
    while (job.attempt < job.maxAttempts) {
      job.attempt += 1;
      const outcome = await runJobAttempt(job);
      if (outcome === 'success') return;

      appendErrorLog({
        level: 'warn',
        source: LOG_SOURCE,
        message: `YouTube ${job.videoId}: tentativa ${job.attempt}/${job.maxAttempts} falhou (${outcome})`,
        detail: job.error ?? outcome,
      });

      if (outcome === 'unavailable') break;

      if (job.attempt < job.maxAttempts) {
        await sleep(1500 * job.attempt);
      }
    }

    job.phase = 'failed';
    job.progress = 0;
    job.error =
      job.error ??
      'Não foi possível descarregar o vídeo (protegido ou indisponível).';
    appendErrorLog({
      level: 'warn',
      source: LOG_SOURCE,
      message: `YouTube ${job.videoId}: download falhou após ${job.attempt} tentativa(s)`,
      detail: job.error,
    });
  } finally {
    job.running = false;
  }
}

export function startYoutubeImportJob(
  home: string,
  url: string,
  category: string,
): YoutubeImportJobSnapshot | null {
  const videoId = parseYouTubeVideoId(url);
  if (!videoId) return null;

  const catDir = path.join(home, 'videos', category);
  if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });

  const jobId = randomUUID();
  const job: YoutubeImportJob = {
    jobId,
    url,
    videoId,
    category,
    home,
    phase: 'downloading',
    progress: 0,
    attempt: 0,
    maxAttempts: YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS,
    running: false,
  };
  jobs.set(jobId, job);
  void runJob(jobId);

  return snapshotYoutubeImportJob(jobId);
}

export async function resolveYoutubeImportJobAsEmbed(
  jobId: string,
): Promise<YoutubeImportJobSnapshot | null> {
  const job = jobs.get(jobId);
  if (!job) return null;

  const canDownload = await probeYoutubeDownloadAvailable(job.url);
  if (canDownload) {
    appendErrorLog({
      level: 'warn',
      source: LOG_SOURCE,
      message: `YouTube ${job.videoId}: pedido online mas download local disponível — a descarregar`,
      detail: `jobId=${jobId}`,
    });
    job.phase = 'downloading';
    job.progress = 0;
    job.attempt = 0;
    job.error = undefined;
    job.mode = undefined;
    job.mediaPath = undefined;
    job.thumbPath = undefined;
    job.maxAttempts = YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS;
    if (!job.running) void runJob(jobId);
    return snapshotYoutubeImportJob(jobId);
  }

  job.mode = 'embed';
  job.phase = 'ready';
  job.progress = 100;
  job.error = undefined;

  appendErrorLog({
    level: 'warn',
    source: LOG_SOURCE,
    message: `YouTube ${job.videoId}: operador escolheu online (embed)`,
    detail: `jobId=${jobId}`,
  });

  return snapshotYoutubeImportJob(jobId);
}

export function retryYoutubeImportJob(jobId: string): YoutubeImportJobSnapshot | null {
  const job = jobs.get(jobId);
  if (!job || job.running) return null;
  if (job.phase !== 'failed') return snapshotYoutubeImportJob(jobId);

  job.phase = 'downloading';
  job.progress = 0;
  job.attempt = 0;
  job.error = undefined;
  job.mode = undefined;
  job.mediaPath = undefined;
  job.thumbPath = undefined;
  job.maxAttempts = YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS;
  void runJob(jobId);

  return snapshotYoutubeImportJob(jobId);
}

export function resetYoutubeImportJobsForTests(): void {
  jobs.clear();
}

/** @deprecated Use YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS */
export const YOUTUBE_IMPORT_MAX_ATTEMPTS = YOUTUBE_IMPORT_MAX_INTERRUPTED_ATTEMPTS;
