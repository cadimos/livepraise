export function apiBase(): string {
  return location.origin;
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, init);
  if (!res.ok) {
    throw new Error(`${path} → HTTP ${res.status}`);
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

export interface MediaFileProperties {
  path: string;
  name: string;
  category: string;
  sizeBytes: number;
  sizeLabel: string;
  modifiedAt: string;
  extension: string;
}
