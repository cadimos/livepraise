import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import {
  assertSafeResolvedAddresses,
  isBlockedIp,
  isDeniedHostname,
  normalizeHostnameForPolicy,
} from '../network/ip-policy.js';

export const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
export const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv|avi|mpg|mpeg|mkv)$/i;

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 3;
const CONNECT_TIMEOUT_MS = 10_000;
const TOTAL_TIMEOUT_MS = 60_000;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 600 * 1024 * 1024;

const REJECTED_CONTENT_TYPES =
  /^(text\/html|application\/json|application\/xml|multipart\/)/i;

export type RemoteFetchCode =
  | 'invalid_url'
  | 'ssrf_blocked'
  | 'youtube_use_dedicated_flow'
  | 'unsupported_type'
  | 'size_exceeded'
  | 'timeout'
  | 'ssl_failed'
  | 'fetch_failed';

export class RemoteFetchError extends Error {
  readonly code: RemoteFetchCode;

  constructor(code: RemoteFetchCode, message: string) {
    super(message);
    this.name = 'RemoteFetchError';
    this.code = code;
  }
}

export interface RemoteMediaLimits {
  maxImageBytes?: number;
  maxVideoBytes?: number;
}

export interface FetchedRemoteMedia {
  body: Buffer;
  contentType: string;
  finalUrl: URL;
  fileName: string;
  mediaKind: 'imagens' | 'videos';
}

function fail(code: RemoteFetchCode, message: string): never {
  throw new RemoteFetchError(code, message);
}

function allowedPort(url: URL): boolean {
  if (!url.port) return true;
  const port = Number(url.port);
  if (url.protocol === 'http:') return port === 80;
  if (url.protocol === 'https:') return port === 443;
  return false;
}

function assertHostnamePolicy(hostname: string): void {
  const normalized = normalizeHostnameForPolicy(hostname);
  if (isDeniedHostname(hostname)) fail('ssrf_blocked', 'Endereço não permitido');
  if (isBlockedIp(normalized)) fail('ssrf_blocked', 'Endereço não permitido');
}

/** Validação sintáctica de URL antes de DNS/fetch. */
export function validateMediaImportUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) {
    fail('invalid_url', 'URL inválida');
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    fail('invalid_url', 'URL inválida');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail('invalid_url', 'URL inválida');
  }
  if (!parsed.hostname) fail('invalid_url', 'URL inválida');
  if (parsed.username || parsed.password) {
    fail('invalid_url', 'URL inválida');
  }
  if (!allowedPort(parsed)) fail('invalid_url', 'URL inválida');
  assertHostnamePolicy(parsed.hostname);
  return parsed;
}

async function resolveAndAssert(hostname: string): Promise<void> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) fail('ssrf_blocked', 'Endereço não permitido');
  assertSafeResolvedAddresses(records.map((r) => r.address));
}

function resolveRedirect(current: URL, location: string): URL {
  const next = new URL(location, current);
  if (location.startsWith('//')) fail('ssrf_blocked', 'Endereço não permitido');
  if (current.protocol === 'https:' && next.protocol === 'http:') {
    fail('ssrf_blocked', 'Endereço não permitido');
  }
  return next;
}

function detectMediaKind(
  contentType: string,
  fileName: string,
): 'imagens' | 'videos' | null {
  const ct = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (ct.startsWith('image/')) return 'imagens';
  if (ct.startsWith('video/')) return 'videos';
  if (ct === 'application/octet-stream' || ct === '') {
    if (IMAGE_EXT.test(fileName)) return 'imagens';
    if (VIDEO_EXT.test(fileName)) return 'videos';
  }
  return null;
}

/** Validação de Content-Type (CA-5) — exportada para smoke/testes sem fetch externo. */
export function assertAllowedContentType(contentType: string, fileName: string): 'imagens' | 'videos' {
  const ct = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!ct || REJECTED_CONTENT_TYPES.test(ct)) {
    fail('unsupported_type', 'Tipo de conteúdo não suportado');
  }
  const kind = detectMediaKind(contentType, fileName);
  if (!kind) fail('unsupported_type', 'Tipo de conteúdo não suportado');
  return kind;
}

function maxBytesForKind(
  kind: 'imagens' | 'videos',
  limits?: RemoteMediaLimits,
): number {
  if (kind === 'imagens') return limits?.maxImageBytes ?? MAX_IMAGE_BYTES;
  return limits?.maxVideoBytes ?? MAX_VIDEO_BYTES;
}

function fileNameFromUrl(url: URL): string {
  const base = pathBasename(url.pathname);
  return base || 'import.bin';
}

function pathBasename(p: string): string {
  const parts = p.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

async function readResponseBody(
  res: http.IncomingMessage,
  maxBytes: number,
  deadlineMs: number,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  return await new Promise<Buffer>((resolve, reject) => {
    const timer = setTimeout(() => {
      res.destroy();
      reject(new RemoteFetchError('timeout', 'Tempo de download excedido'));
    }, Math.max(1, deadlineMs - Date.now()));

    res.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        clearTimeout(timer);
        res.destroy();
        reject(new RemoteFetchError('size_exceeded', 'Ficheiro demasiado grande'));
        return;
      }
      chunks.push(chunk);
    });
    res.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks));
    });
    res.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function httpGetOnce(
  url: URL,
  deadlineMs: number,
): Promise<{
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body?: Buffer;
  location?: string;
}> {
  await resolveAndAssert(url.hostname);
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;
  const port = url.port ? Number(url.port) : isHttps ? 443 : 80;

  return await new Promise((resolve, reject) => {
    const started = Date.now();
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        headers: {
          'User-Agent': 'LivePraise-MediaImport/1.0',
          Accept: 'image/*,video/*,*/*;q=0.1',
          Connection: 'close',
        },
        timeout: CONNECT_TIMEOUT_MS,
        lookup: (hostname, options, cb) => {
          dns.lookup(hostname, { all: true, verbatim: true })
            .then((records) => {
              assertSafeResolvedAddresses(records.map((r) => r.address));
              if (options.all) {
                cb(
                  null,
                  records.map((r) => ({ address: r.address, family: r.family })),
                );
                return;
              }
              const preferred = records.find((r) => r.family === 4) ?? records[0]!;
              cb(null, preferred.address, preferred.family === 6 ? 6 : 4);
            })
            .catch((err) => cb(err as NodeJS.ErrnoException, '', 4));
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;
        const location = res.headers.location;
        if (statusCode >= 300 && statusCode < 400 && location) {
          res.resume();
          resolve({ statusCode, headers: res.headers, location });
          return;
        }
        const fileName = fileNameFromUrl(url);
        const contentType = String(res.headers['content-type'] ?? '');
        const kind = assertAllowedContentType(contentType, fileName);
        const maxBytes = maxBytesForKind(kind);
        readResponseBody(res, maxBytes, deadlineMs)
          .then((body) => resolve({ statusCode, headers: res.headers, body }))
          .catch(reject);
      },
    );

    req.on('timeout', () => {
      req.destroy(new RemoteFetchError('timeout', 'Tempo de ligação excedido'));
    });
    req.on('error', (err) => {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        reject(new RemoteFetchError('ssl_failed', 'Ligação segura falhou'));
        return;
      }
      reject(err);
    });
    req.end();

    if (Date.now() - started > TOTAL_TIMEOUT_MS) {
      req.destroy(new RemoteFetchError('timeout', 'Tempo de download excedido'));
    }
  });
}

/** GET controlado com redirects manuais e validação SSRF em cada hop. */
export async function fetchRemoteMedia(
  initialUrl: URL,
  limits?: RemoteMediaLimits,
): Promise<FetchedRemoteMedia> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let current = validateMediaImportUrl(initialUrl.toString());
  let redirects = 0;

  while (true) {
    if (Date.now() > deadline) fail('timeout', 'Tempo de download excedido');
    let response: Awaited<ReturnType<typeof httpGetOnce>>;
    try {
      response = await httpGetOnce(current, deadline);
    } catch (err) {
      if (err instanceof RemoteFetchError) throw err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
        fail('fetch_failed', 'Não foi possível obter o ficheiro');
      }
      if (code === 'ETIMEDOUT' || code === 'ESOCKETTIMEDOUT') {
        fail('timeout', 'Tempo de download excedido');
      }
      fail('fetch_failed', 'Não foi possível obter o ficheiro');
    }

    const { statusCode, location, body } = response;
    if (statusCode >= 300 && statusCode < 400 && location) {
      if (redirects >= MAX_REDIRECTS) fail('fetch_failed', 'Demasiados redirects');
      redirects += 1;
      current = validateMediaImportUrl(resolveRedirect(current, location).toString());
      continue;
    }
    if (statusCode < 200 || statusCode >= 300 || !body) {
      fail('fetch_failed', 'Não foi possível obter o ficheiro');
    }

    const contentType = String(response.headers['content-type'] ?? '');
    const fileName = fileNameFromUrl(current);
    const mediaKind = assertAllowedContentType(contentType, fileName);
    if (body.length > maxBytesForKind(mediaKind, limits)) {
      fail('size_exceeded', 'Ficheiro demasiado grande');
    }
    return { body, contentType, finalUrl: current, fileName, mediaKind };
  }
}
