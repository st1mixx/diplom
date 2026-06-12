const API = 'http://localhost:3000/api';

function showToast(message, type = '') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!getToken();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function updateHeader() {
  const headerAuth = document.getElementById('headerAuth');
  if (!headerAuth) return;

  const user = getUser();

  if (user) {
    headerAuth.innerHTML = `
      <a href="cabinet.html" class="btn btn-outline btn-sm">👤 ${user.name}</a>
      ${user.role === 'admin'
        ? '<a href="admin.html" class="btn btn-sm btn-primary">⚙️ Адмін</a>'
        : user.role === 'manager'
        ? '<a href="manager.html" class="btn btn-sm btn-primary">⚙️ Менеджер</a>'
        : ''}
      <button class="btn btn-sm" onclick="logout()"
        style="background:var(--surface-2);color:var(--text-2)">Вийти</button>
    `;
  } else {
    headerAuth.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Вхід</a>
      <a href="login.html" class="btn btn-primary btn-sm">Реєстрація</a>
    `;
  }
}

async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errorEl  = document.getElementById('loginError');

  errorEl.textContent = '';

  if (!email || !password) {
    errorEl.textContent = 'Заповніть усі поля';
    return;
  }

  try {
    const response = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || 'Помилка входу';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showToast('Вхід успішний! 👋', 'success');

    setTimeout(() => {
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else if (data.user.role === 'manager') {
        window.location.href = 'manager.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 800);

  } catch (err) {
    errorEl.textContent = 'Помилка підключення до сервера';
  }
}

async function register() {
  const name     = document.getElementById('registerName').value.trim();
  const email    = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const errorEl  = document.getElementById('registerError');

  errorEl.textContent = '';

  if (!name || !email || !password) {
    errorEl.textContent = 'Заповніть усі поля';
    return;
  }

  if (password.length < 6) {
    errorEl.textContent = 'Пароль має містити мінімум 6 символів';
    return;
  }

  try {
    const response = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      errorEl.textContent = data.error || 'Помилка реєстрації';
      return;
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showToast('Реєстрація успішна! 🎉', 'success');
    setTimeout(() => { window.location.href = 'index.html'; }, 800);

  } catch (err) {
    errorEl.textContent = 'Помилка підключення до сервера';
  }
}

updateHeader();