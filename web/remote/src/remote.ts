import {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthUser,
} from '/shared/auth-session.js';
import type { AuthSessionResponse } from '@shared/types/auth-api';
import type {
  RemoteChromeTabResponse,
  RemoteLiveRequestKind,
  RemoteLiveRequestResponse,
} from '@shared/types/remote-api';

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

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Elemento #${id} não encontrado`);
  return el as T;
}

function setStatus(text: string): void {
  byId('status').textContent = text;
}

function showGate(message: string): void {
  byId<HTMLElement>('gate').hidden = false;
  byId('gate-message').textContent = message;
  byId<HTMLElement>('panel').hidden = true;
}

function showPanel(user: AuthUser, token: string): void {
  byId<HTMLElement>('gate').hidden = true;
  byId<HTMLElement>('panel').hidden = false;
  byId('user-name').textContent = user.username;

  const authHeaders = (): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  byId<HTMLFormElement>('tab-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const label = byId<HTMLInputElement>('tab-label').value.trim();
    const songName = byId<HTMLInputElement>('tab-song').value.trim();

    const res = await fetch('/api/remote/chrome-tab', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ label, songName: songName || undefined }),
    });
    const data = (await res.json()) as RemoteChromeTabResponse;
    setStatus(res.ok ? `Aba "${label}" enviada.` : data.error ?? 'Erro');
  });

  byId<HTMLFormElement>('live-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = byId<HTMLSelectElement>('live-kind').value as RemoteLiveRequestKind;
    const raw = byId<HTMLInputElement>('live-payload').value.trim();
    const payload =
      kind === 'live-video'
        ? { url: encodeURIComponent(raw) }
        : { html: raw };

    const res = await fetch('/api/remote/live-request', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ kind, payload }),
    });
    const data = (await res.json()) as RemoteLiveRequestResponse;
    setStatus(
      res.ok
        ? `Pedido ${data.approval?.id?.slice(0, 8)} aguarda aprovação.`
        : data.error ?? 'Erro',
    );
  });
}

async function init(): Promise<void> {
  const session = readSession();
  if (!session) {
    showGate('Faça login no portal com perfil remoto.');
    return;
  }

  const res = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${session.token}` },
  });

  if (!res.ok) {
    clearSession();
    location.href = '/';
    return;
  }

  const data = (await res.json()) as AuthSessionResponse;
  saveSession(session.token, data.user);

  if (data.user.role !== 'remote' && data.user.role !== 'admin') {
    showGate(
      `Seu perfil (${data.user.role}) não tem acesso ao envio remoto. Entre com um usuário remoto ou peça ao administrador.`,
    );
    return;
  }

  showPanel(data.user, session.token);
}

void init();
