/** Sessão portal/remoto — mesmas chaves que `web/portal/portal.js`. */
export const AUTH_TOKEN_KEY = 'livepraise.auth.token';
export const AUTH_USER_KEY = 'livepraise.auth.user';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
  active?: number | boolean;
}

export function readAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return token?.trim() ? token : null;
}

export function readAuthSession(): { token: string; user: AuthUser } | null {
  const token = readAuthToken();
  if (!token || typeof localStorage === 'undefined') return null;
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return null;
  }
}

/** Consola Electron / loopback HTTP — WebSocket no servidor aceita join sem token. */
export function isBrowserLoopbackHost(): boolean {
  const loc = (globalThis as { location?: { hostname?: string } }).location;
  if (!loc) return true;
  const host = loc.hostname ?? '';
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}
