/** Normaliza path de mídia para API (`imagens/...` ou `videos/...`). */
export function normalizeMediaPathForApi(
  rawUrl: string,
  kind: 'imagens' | 'videos',
): string {
  let path = rawUrl.trim().replaceAll('\\', '/');
  if (/^https?:\/\//i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      /* mantém path original */
    }
  }
  path = path.replace(/^\/+/, '');
  if (!path.startsWith(`${kind}/`)) {
    path = `${kind}/${path.replace(/^(imagens|videos)\//, '')}`;
  }
  return path;
}
