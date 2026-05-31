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

function showLoggedIn(user) {
  document.getElementById('login-section').hidden = true;
  document.getElementById('views-section').hidden = false;
  document.getElementById('session-user').textContent = `${user.username} (${user.role})`;

  const remoteLink = document.getElementById('remote-link');
  const operatorLink = document.getElementById('operator-link');
  remoteLink.hidden = user.role !== 'remote';
  operatorLink.hidden = user.role !== 'operator';
}

async function verifyExistingSession() {
  const session = readSession();
  if (!session) return;

  const res = await fetch('/api/auth/session', {
    headers: { Authorization: `Bearer ${session.token}` },
  });
  if (!res.ok) {
    clearSession();
    return;
  }
  const data = await res.json();
  saveSession(session.token, data.user);
  showLoggedIn(data.user);
}

document.getElementById('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const errorEl = document.getElementById('login-error');
  errorEl.hidden = true;

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    errorEl.textContent = data.error ?? 'Falha no login';
    errorEl.hidden = false;
    return;
  }

  saveSession(data.token, data.user);
  showLoggedIn(data.user);
});

document.getElementById('logout-btn').addEventListener('click', async () => {
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
