import { fetchJson, apiBase } from '../composables/useApi';
import { readAuthToken } from '@shared/auth-session';
import type { QueueItem } from '@shared/queue-items';

const YOUTUBE_START_PATHS = ['/video/importar/youtube', '/api/queue/youtube'] as const;

const MEDIA_URL_PATHS = [
  '/api/queue/import-url',
  '/video/importar/url',
  '/imagem/importar/url',
] as const;

export type YoutubeImportJobPhase = 'downloading' | 'processing' | 'ready' | 'failed';

export interface YoutubeImportJobResponse {
  status: string;
  async?: boolean;
  jobId?: string;
  videoId?: string;
  phase?: YoutubeImportJobPhase;
  progress?: number;
  attempt?: number;
  maxAttempts?: number;
  error?: string;
  mode?: 'local' | 'embed';
  warning?: string;
  item: Record<string, unknown>;
}

async function fetchWithFallback<T>(
  paths: readonly string[],
  init?: RequestInit,
): Promise<T> {
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      return await fetchJson<T>(path, init);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (!lastError.message.includes('HTTP 404')) throw lastError;
    }
  }
  throw lastError ?? new Error('Pedido falhou');
}

export async function postYoutubeImportStart(body: {
  url: string;
  category: string;
}): Promise<YoutubeImportJobResponse> {
  return fetchWithFallback<YoutubeImportJobResponse>(YOUTUBE_START_PATHS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchYoutubeImportStatus(
  jobId: string,
): Promise<YoutubeImportJobResponse> {
  return fetchWithFallback<YoutubeImportJobResponse>([
    `/video/importar/youtube/jobs/${encodeURIComponent(jobId)}`,
    `/api/queue/youtube/jobs/${encodeURIComponent(jobId)}`,
  ]);
}

export async function postYoutubeImportEmbed(
  jobId: string,
): Promise<YoutubeImportJobResponse> {
  return fetchWithFallback<YoutubeImportJobResponse>([
    `/video/importar/youtube/jobs/${encodeURIComponent(jobId)}/embed`,
    `/api/queue/youtube/jobs/${encodeURIComponent(jobId)}/embed`,
  ], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function postYoutubeImportRetry(
  jobId: string,
): Promise<YoutubeImportJobResponse> {
  return fetchWithFallback<YoutubeImportJobResponse>([
    `/video/importar/youtube/jobs/${encodeURIComponent(jobId)}/retry`,
    `/api/queue/youtube/jobs/${encodeURIComponent(jobId)}/retry`,
  ], {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

export async function postMediaUrlImport(
  body: { url: string; category: string; mode?: 'download' | 'reference' },
): Promise<{
  status: string;
  mode: 'download' | 'reference';
  item: Record<string, unknown>;
}> {
  return fetchWithFallback<{
    status: string;
    mode: 'download' | 'reference';
    item: Record<string, unknown>;
  }>(MEDIA_URL_PATHS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'download', ...body }),
  });
}

export async function postQueueUpload(
  file: File,
  category: string,
): Promise<{ item: Record<string, unknown> }> {
  const paths =
    /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name)
      ? ['/imagem/importar/upload', '/api/queue/upload']
      : ['/video/importar/upload', '/api/queue/upload'];

  const token = readAuthToken();
  const params = new URLSearchParams({ category, filename: file.name });
  const headers: HeadersInit = { 'Content-Type': 'application/octet-stream' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastError: Error | null = null;
  for (const path of paths) {
    const res = await fetch(`${apiBase()}${path}?${params}`, {
      method: 'POST',
      headers,
      body: file,
    });
    if (res.ok) return res.json() as Promise<{ item: Record<string, unknown> }>;
    if (res.status !== 404) {
      throw new Error(`upload ${path} → HTTP ${res.status}`);
    }
    lastError = new Error(`upload ${path} → HTTP 404`);
  }
  throw lastError ?? new Error('upload failed');
}

export function queueItemFromYoutubeJobResponse(
  data: YoutubeImportJobResponse,
  itemId: string,
): QueueItem {
  const raw = data.item ?? {};
  return {
    kind: 'video',
    label: String(raw.label ?? `YouTube ${data.videoId ?? ''}`),
    id: itemId,
    previewVideoId:
      typeof raw.previewVideoId === 'string' ? raw.previewVideoId : data.videoId,
    youtubeImportJobId:
      typeof raw.youtubeImportJobId === 'string' ? raw.youtubeImportJobId : data.jobId,
    youtubeImportPhase:
      (raw.youtubeImportPhase as QueueItem['youtubeImportPhase']) ?? data.phase ?? 'downloading',
    youtubeImportProgress:
      typeof raw.youtubeImportProgress === 'number'
        ? raw.youtubeImportProgress
        : data.progress ?? 0,
    youtubeImportAttempt:
      typeof raw.youtubeImportAttempt === 'number' ? raw.youtubeImportAttempt : data.attempt ?? 0,
    youtubeImportMaxAttempts:
      typeof raw.youtubeImportMaxAttempts === 'number'
        ? raw.youtubeImportMaxAttempts
        : data.maxAttempts ?? 3,
    youtubeImportError:
      typeof raw.youtubeImportError === 'string' ? raw.youtubeImportError : data.error,
    mediaPath: typeof raw.mediaPath === 'string' ? raw.mediaPath : undefined,
    thumbPath: typeof raw.thumbPath === 'string' ? raw.thumbPath : undefined,
    youtubeVideoId:
      typeof raw.youtubeVideoId === 'string' ? raw.youtubeVideoId : undefined,
  };
}

export function patchQueueItemFromYoutubeJob(
  data: YoutubeImportJobResponse,
): Partial<QueueItem> {
  const ytThumbId = data.videoId;

  if (data.phase === 'ready' && data.item) {
    const raw = data.item;
    const isEmbedOnly =
      typeof raw.youtubeVideoId === 'string' && !raw.mediaPath;
    return {
      kind: 'video',
      label: typeof raw.label === 'string' ? raw.label : undefined,
      mediaPath: typeof raw.mediaPath === 'string' ? raw.mediaPath : undefined,
      previewVideoId:
        typeof raw.previewVideoId === 'string'
          ? raw.previewVideoId
          : ytThumbId,
      youtubeVideoId: isEmbedOnly
        ? (typeof raw.youtubeVideoId === 'string' ? raw.youtubeVideoId : ytThumbId)
        : undefined,
      thumbPath: typeof raw.thumbPath === 'string' ? raw.thumbPath : undefined,
      youtubeImportJobId: undefined,
      youtubeImportPhase: undefined,
      youtubeImportProgress: undefined,
      youtubeImportAttempt: undefined,
      youtubeImportMaxAttempts: undefined,
      youtubeImportError: undefined,
    };
  }

  if (data.phase === 'failed') {
    return {
      youtubeImportPhase: 'failed',
      youtubeImportProgress: 0,
      youtubeImportAttempt: data.attempt,
      youtubeImportMaxAttempts: data.maxAttempts,
      youtubeImportError: data.error,
      previewVideoId: data.videoId,
    };
  }

  return {
    youtubeImportPhase: data.phase === 'processing' ? 'processing' : 'downloading',
    youtubeImportProgress: data.progress ?? 0,
    youtubeImportAttempt: data.attempt,
    youtubeImportMaxAttempts: data.maxAttempts,
    previewVideoId: data.videoId,
    youtubeImportError: undefined,
  };
}

/** @deprecated Use postYoutubeImportStart */
export async function postYoutubeImport(body: {
  url: string;
  category: string;
}): Promise<YoutubeImportJobResponse> {
  return postYoutubeImportStart(body);
}
