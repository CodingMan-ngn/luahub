// ── API helper ────────────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
    }
  }
  if (body) opts.body = JSON.stringify(body)
  try {
    const res = await fetch(path, opts)
    return res.json()
  } catch (e) {
    return { error: e.message }
  }
}

// ── Auth modal ────────────────────────────────────────────────────
let authMode = 'login'

function openAuthModal() {
  const m = document.getElementById('auth-modal')
  if (m) m.classList.remove('hidden')
}

function closeModal() {
  const m = document.getElementById('auth-modal')
  if (m) m.classList.add('hidden')
}

function toggleModal() {
  authMode = authMode === 'login' ? 'register' : 'login'
  const title  = document.getElementById('modal-title')
  const uField = document.getElementById('auth-username')
  const toggle = document.getElementById('modal-toggle')
  if (title)  title.textContent  = authMode === 'login' ? 'Login' : 'Register'
  if (uField) uField.style.display = authMode === 'register' ? 'block' : 'none'
  if (toggle) toggle.innerHTML = authMode === 'login'
    ? 'No account? <a href="#" onclick="toggleModal()">Register</a>'
    : 'Have an account? <a href="#" onclick="toggleModal()">Login</a>'
}

async function submitAuth() {
  const email    = document.getElementById('auth-email').value.trim()
  const password = document.getElementById('auth-pass').value
  const uEl      = document.getElementById('auth-username')
  const username = uEl ? uEl.value.trim() : ''
  const errEl    = document.getElementById('modal-error')

  const payload = authMode === 'login'
    ? { action: 'login', email, password }
    : { action: 'register', email, password, username }

  const res = await apiFetch('/api/auth', 'POST', payload)

  if (res.token) {
    localStorage.setItem('token',    res.token)
    localStorage.setItem('username', res.username)
    localStorage.setItem('api_key',  res.api_key)
    closeModal()
    syncNav()
    location.href = '/dashboard'
  } else {
    if (errEl) errEl.textContent = '❌ ' + (res.error || 'unknown error')
  }
}

function logout() {
  localStorage.clear()
  location.href = '/'
}

// ── Nav state ─────────────────────────────────────────────────────
function syncNav() {
  const token = localStorage.getItem('token')
  const show  = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v }
  if (token) {
    show('nav-dash',   'inline')
    show('nav-login',  'none')
    show('nav-logout', 'inline')
    const u = document.getElementById('nav-user')
    if (u) u.textContent = '👤 ' + (localStorage.getItem('username') || '')
  } else {
    show('nav-dash',   'none')
    show('nav-login',  'inline')
    show('nav-logout', 'none')
  }
}

window.addEventListener('DOMContentLoaded', syncNav)
