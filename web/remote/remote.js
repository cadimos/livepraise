const TOKEN_KEY = 'livepraise.auth.token';
const USER_KEY = 'livepraise.auth.user';

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function readSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);
  if (!token || !rawUser) return null;
  try {
    return { token, user: JSON.parse(rawUser) };
  } catch {
    return null;
  }
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function showGate(message) {
  document.getElementById('gate').hidden = false;
  document.getElementById('gate-message').textContent = message;
  document.getElementById('panel').hidden = true;
}

function showPanel(user, token) {
  document.getElementById('gate').hidden = true;
  document.getElementById('panel').hidden = false;
  document.getElementById('user-name').textContent = user.username;

  const authHeaders = () => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  });

  document.getElementById('tab-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const label = document.getElementById('tab-label').value.trim();
    const songName = document.getElementById('tab-song').value.trim();

    const res = await fetch('/api/remote/chrome-tab', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ label, songName: songName || undefined }),
    });
    const data = await res.json();
    setStatus(res.ok ? `Aba "${label}" enviada.` : data.error ?? 'Erro');
  });

  document.getElementById('live-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const kind = document.getElementById('live-kind').value;
    const raw = document.getElementById('live-payload').value.trim();
    const payload =
      kind === 'live-video'
        ? { url: encodeURIComponent(raw) }
        : { html: raw };

    const res = await fetch('/api/remote/live-request', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ kind, payload }),
    });
    const data = await res.json();
    setStatus(
      res.ok
        ? `Pedido ${data.approval?.id?.slice(0, 8)} aguarda aprovação.`
        : data.error ?? 'Erro',
    );
  });
}

async function init() {
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

  const data = await res.json();
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
