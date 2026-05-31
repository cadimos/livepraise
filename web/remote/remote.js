const TOKEN_KEY = 'livepraise.auth.token';
const USER_KEY = 'livepraise.auth.user';

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

async function authHeaders() {
  const session = readSession();
  if (!session) return null;
  const res = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) return null;
  return { Authorization: `Bearer ${session.token}` };
}

async function init() {
  const session = readSession();
  if (!session || session.user.role !== 'remote') {
    document.getElementById('gate').hidden = false;
    document.getElementById('panel').hidden = true;
    return;
  }

  const headers = await authHeaders();
  if (!headers) {
    location.href = '/';
    return;
  }

  document.getElementById('gate').hidden = true;
  document.getElementById('panel').hidden = false;
  document.getElementById('user-name').textContent = session.user.username;

  document.getElementById('tab-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const label = document.getElementById('tab-label').value.trim();
    const songName = document.getElementById('tab-song').value.trim();

    const res = await fetch('/api/remote/chrome-tab', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
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
      headers: { ...headers, 'Content-Type': 'application/json' },
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

void init();
