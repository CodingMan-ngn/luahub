const SUPABASE_URL = 'https://cnwpjepbipnqirgdrque.supabase.co'

// 1. Capture Token
;(function captureToken() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('token', token)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const name = payload?.user_metadata?.full_name || payload?.user_metadata?.name || payload?.user_metadata?.user_name || 'User'
        localStorage.setItem('username', name)
      } catch {}
      window.history.replaceState(null, '', window.location.pathname)
    }
  }
})()

function loginDiscord() {
  const redirectUrl = window.location.origin + '/';
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`
}

function logout() {
  localStorage.clear()
  window.location.reload()
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('active')
  })
}, { threshold: 0.1 })

async function verifyAccess(token) {
  try {
    const res = await fetch('/api/auth-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token })
    });
    const data = await res.json();
    return res.ok ? { ok: true } : { ok: false, error: data.error };
  } catch (e) {
    return { ok: false, error: 'Network error verifying access.' };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token')
  const loginScreen = document.getElementById('login-screen')
  const app = document.getElementById('app')
  const preloader = document.getElementById('preloader')

  setTimeout(async () => {
    preloader.classList.add('done')
    
    if (!token) {
      loginScreen.classList.remove('hidden')
    } else {
      // Verify Discord Role
      const check = await verifyAccess(token);
      if (!check.ok) {
        localStorage.clear();
        document.getElementById('auth-error').textContent = check.error || 'Access Denied';
        document.getElementById('auth-error').classList.remove('hidden');
        loginScreen.classList.remove('hidden');
        return;
      }
      
      // Grant Access
      app.classList.add('visible')
      document.getElementById('user-name').textContent = localStorage.getItem('username')
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
      loadScripts()
    }
  }, 800)
})

async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(path, opts)
  return res.json()
}

async function uploadScript() {
  const btn = document.getElementById('upload-btn')
  const name = document.getElementById('s-name').value.trim()
  const content = document.getElementById('s-code').value.trim()
  if (!name || !content) return alert('Name and payload required')

  btn.disabled = true; btn.textContent = 'Deploying...'
  try {
    const res = await apiFetch('/api/scripts', 'POST', { name, content, is_public: true })
    const box = document.getElementById('upload-result')
    box.classList.remove('hidden')
    if (res && res.slug) {
      const url = `${window.location.origin}/api/loader/${res.slug}`
      box.innerHTML = `<p>✅ Deployed! Loader URL:</p><code style="display:block;margin-top:0.5rem;color:var(--green)">loadstring(game:HttpGet("${url}"))()</code>`
      document.getElementById('s-name').value = ''
      document.getElementById('s-code').value = ''
      loadScripts()
    } else {
      box.innerHTML = `<p style="color:#ef4444">Error: ${res?.error}</p>`
    }
  } catch (e) { alert(e.message) }
  btn.disabled = false; btn.textContent = 'Deploy Script'
}

async function loadScripts() {
  const box = document.getElementById('my-scripts')
  const scripts = await apiFetch('/api/scripts', 'GET')
  if (!Array.isArray(scripts) || !scripts.length) {
    box.innerHTML = '<p style="color: var(--muted)">No scripts deployed yet.</p>'
    return
  }
  box.innerHTML = scripts.map(s => `
    <div class="script-card">
      <strong>${s.name}</strong>
      <span style="font-size:0.8rem;color:var(--muted)">👁 ${s.hits || 0} hits</span>
      <code>loadstring(game:HttpGet("${window.location.origin}/api/loader/${s.slug}"))()</code>
    </div>
  `).join('')
}