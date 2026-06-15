import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthUser,
} from '@shared/auth-session';
import type { AuthLoginResponse, AuthSessionResponse } from '@shared/types/auth-api';

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function readSession(): { token: string; user: AuthUser } | null {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const rawUser = localStorage.getItem(AUTH_USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) as AuthUser };
  } catch {
    return null;
  }
}

function consumeReturnUrl(): string | null {
  const params = new URLSearchParams(location.search);
  const raw = params.get('return');
  if (!raw) return null;
  try {
    const path = decodeURIComponent(raw);
    if (!path.startsWith('/') || path.startsWith('//')) return null;
    return path;
  } catch {
    return null;
  }
}

function redirectAfterLogin(user: AuthUser): boolean {
  const returnTo = consumeReturnUrl();
  if (!returnTo) return false;
  if (returnTo.startsWith('/operator') && user.role !== 'operator' && user.role !== 'admin') {
    return false;
  }
  if (
    returnTo.startsWith('/remote') &&
    user.role !== 'remote' &&
    user.role !== 'admin'
  ) {
    return false;
  }
  location.replace(returnTo);
  return true;
}

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function showLoggedIn(user: AuthUser): void {
  byId<HTMLElement>('login-section').hidden = true;
  byId<HTMLElement>('views-section').hidden = false;
  byId('session-user').textContent = `${user.username} (${user.role})`;

  const remoteLink = byId<HTMLElement>('remote-link');
  const operatorLink = byId<HTMLElement>('operator-link');
  remoteLink.hidden = user.role !== 'remote' && user.role !== 'admin';
  operatorLink.hidden = user.role !== 'operator' && user.role !== 'admin';

  redirectAfterLogin(user);
}

async function verifyExistingSession(): Promise<void> {
  const session = readSession();
  if (!session) return;

  const res = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) {
    clearSession();
    return;
  }
  const data = (await res.json()) as AuthSessionResponse;
  saveSession(session.token, data.user);
  showLoggedIn(data.user);
}

byId<HTMLFormElement>('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorEl = byId<HTMLElement>('login-error');
  errorEl.hidden = true;

  const username = byId<HTMLInputElement>('username').value.trim();
  const password = byId<HTMLInputElement>('password').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = (await res.json()) as AuthLoginResponse;
  if (!res.ok) {
    errorEl.textContent = data.error ?? 'Falha no login';
    errorEl.hidden = false;
    return;
  }

  if (!data.token || !data.user) return;
  saveSession(data.token, data.user);
  showLoggedIn(data.user);
});

byId('logout-btn').addEventListener('click', async () => {
  const session = readSession();
  if (session) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.token}` },
    });
  }
  clearSession();
  location.reload();
});

void verifyExistingSession();
