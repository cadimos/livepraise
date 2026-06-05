/**
 * Resolve valor de live-action (background/video) para URL absoluta no browser atual.
 * Aceita path relativo (/imagens/...) ou URL absoluta; reescreve loopback para LAN (CAD-186).
 */
export function resolveProjectionMediaUrl(valor) {
  let path;
  try {
    path = decodeURIComponent(String(valor ?? ''));
  } catch {
    path = String(valor ?? '').trim();
  }
  path = path.replaceAll('\\', '/');
  if (!path) return '';

  if (path.startsWith('data:')) return path;

  const origin =
    typeof location !== 'undefined' && location.origin ? location.origin : '';

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      if (
        origin &&
        (url.hostname === '127.0.0.1' ||
          url.hostname === 'localhost' ||
          url.hostname === '[::1]')
      ) {
        return `${origin}${url.pathname}${url.search}`;
      }
    } catch {
      return path;
    }
    return path;
  }

  if (!origin) return path;
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
