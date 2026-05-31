import fs from 'node:fs';
import path from 'node:path';

export type MediaKind = 'imagens' | 'videos';

/** Normaliza referência de mídia para `imagens/...` ou `videos/...` (path, URL absoluta ou relativa). */
export function normalizeMediaRelativeRef(
  rawUrl: string,
  kind: MediaKind,
): string | null {
  let path = String(rawUrl).trim().replaceAll('\\', '/');
  if (!path || path.includes('base64') || path.startsWith('data:')) return null;

  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      return null;
    }
  }

  path = path.replace(/^\/+/, '');
  if (!path.startsWith(`${kind}/`)) {
    const other = kind === 'imagens' ? 'videos/' : 'imagens/';
    if (path.startsWith(other)) return null;
    path = `${kind}/${path}`;
  }

  return path;
}

/** Valida path relativo `imagens/cat/file.jpg` ou `videos/cat/file.mp4` dentro do home. */
export function resolveMediaRelativePath(
  home: string,
  kind: MediaKind,
  relativePath: string,
): string | null {
  const normalized = normalizeMediaRelativeRef(relativePath, kind);
  if (!normalized || normalized.includes('..')) return null;

  const full = path.join(home, normalized);
  const resolved = path.resolve(full);
  const root = path.resolve(path.join(home, kind));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;

  return resolved;
}

export function mediaPathParts(
  relativePath: string,
  kind: MediaKind,
): { category: string; fileName: string } | null {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\//, '');
  const prefix = `${kind}/`;
  if (!normalized.startsWith(prefix)) return null;
  const rest = normalized.slice(prefix.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const category = rest.slice(0, slash);
  const fileName = rest.slice(slash + 1);
  if (!category || !fileName || fileName.includes('/')) return null;
  return { category, fileName };
}
