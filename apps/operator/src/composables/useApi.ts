import { readAuthToken } from '@shared/auth-session';
import {
  isQuickBackgroundVideo,
  videoThumbRelativePath,
} from '../utils/projection-mode';

export function apiBase(): string {
  return location.origin;
}

function authHeaders(): HeadersInit {
  const token = readAuthToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders())) {
    headers.set(key, value);
  }
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `${path} → HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function mediaUrl(relativePath: string): string {
  if (relativePath.startsWith('data:') || relativePath.startsWith('http')) {
    return relativePath;
  }
  return `${apiBase()}/${relativePath.replace(/^\//, '')}`;
}

export interface MusicCategory {
  id: number;
  nome?: string;
  descricao?: string;
}

export interface Song {
  id: number;
  nome: string;
  nome2?: string;
  artista: string;
  compositor?: string;
  cat: number | string;
  /** Versos agregados para pesquisa (CAD-183). */
  texto_versos?: string;
}

export interface Verse {
  id: number;
  musica: number;
  verso: string;
}

export interface BibleEntry {
  nome: string;
  arquivo: string;
}

export interface BibleBook {
  id: number;
  nome: string;
}

export interface BibleVerse {
  id: number;
  texto: string;
  versiculo: number;
}

export interface QuickBackground {
  id?: number;
  url: string;
  diretorio?: string;
  inicial?: string;
}

/** URL para miniatura/prévia (vídeo em fundo rápido usa thumb JPEG). */
export function quickBackgroundDisplayUrl(item: QuickBackground): string {
  if (item.url.includes('base64')) return item.url;
  if (isQuickBackgroundVideo(item)) {
    const thumb = videoThumbRelativePath(item.url);
    if (thumb) return mediaUrl(thumb);
  }
  return mediaUrl(item.url);
}

/** URL absoluta do ficheiro de mídia para projeção. */
export function quickBackgroundProjectionUrl(item: QuickBackground): string {
  if (item.url.includes('base64')) return item.url;
  return mediaUrl(item.url);
}

export interface MediaFileProperties {
  path: string;
  name: string;
  category: string;
  sizeBytes: number;
  sizeLabel: string;
  modifiedAt: string;
  extension: string;
}
