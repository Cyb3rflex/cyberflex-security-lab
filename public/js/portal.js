// Cyberflex Industries — Corporate Portal Client Helper

async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    const userSlot = document.getElementById('nav-user-slot');
    if (!userSlot) return;

    if (data.authenticated && data.user) {
      userSlot.innerHTML = `
        <span style="font-size: 0.875rem; color: var(--text-muted);">
          Hello, <strong>${escapeHtml(data.user.full_name || data.user.username)}</strong>
          (${escapeHtml(data.user.role)})
        </span>
        <button onclick="handleLogout()" class="btn btn-secondary btn-sm">Sign Out</button>
      `;
    } else {
      userSlot.innerHTML = `
        <a href="/login.html" class="btn btn-secondary btn-sm">Sign In</a>
        <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
      `;
    }
  } catch (e) {
    console.error('Auth check error:', e);
  }
}

async function handleLogout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  } catch (e) {
    console.error('Logout error:', e);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', checkAuth);
