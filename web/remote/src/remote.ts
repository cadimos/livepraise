const TOKEN_KEY = 'livepraise.auth.token';
const USER_KEY = 'livepraise.auth.user';

interface AuthUser {
  username: string;
  role: string;
}

interface AuthSession {
  token: string;
  user: AuthUser;
}

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function readSession(): AuthSession | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
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
    const data = (await res.json()) as { error?: string };
    setStatus(res.ok ? `Aba "${label}" enviada.` : data.error ?? 'Erro');
  });

  byId<HTMLFormElement>('live-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = byId<HTMLSelectElement>('live-kind').value;
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
    const data = (await res.json()) as { error?: string; approval?: { id?: string } };
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

  const data = (await res.json()) as { user: AuthUser };
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
