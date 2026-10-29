// frontend/assets/app.js
const SUPABASE_URL = 'https://cnwpjepbipnqirgdrque.supabase.co'

// 1. Capture token IMMEDIATELY (synchronously) before anything else runs
;(function captureTokenNow() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('token', token)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const name = payload?.user_metadata?.full_name || payload?.user_metadata?.name || payload?.user_metadata?.user_name || 'user'
        localStorage.setItem('username', name)
        localStorage.setItem('user_id', payload.sub)
      } catch (e) {
        console.error('Token decode error', e)
      }
      // Clean the ugly hash from the URL bar so it doesn't trigger again on refresh
      window.history.replaceState(null, '', window.location.pathname)
    }
  }
})()

async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (localStorage.getItem('token') || '')
    }
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(path, opts)
  return res.json()
}

function loginDiscord() {
  const redirectUrl = window.location.origin + '/dashboard'
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`
}

function logout() {
  localStorage.clear()
  window.location.href = '/'
}

function openModal() { document.getElementById('auth-modal')?.classList.remove('hidden') }
function closeModal() { document.getElementById('auth-modal')?.classList.add('hidden') }

// 3D tilt
function attachTilt() {
  document.querySelectorAll('.feat').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const cx = rect.width / 2
      const cy = rect.height / 2
      const rx = ((y - cy) / cy) * -10
      const ry = ((x - cx) / cx) * 10
      card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.02,1.02,1.02)`
    })
    card.addEventListener('mouseleave', () => {
      card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale3d(1,1,1)`
    })
  })
}

// Preloader
function runPreloader() {
  const pre = document.getElementById('preloader')
  if (!pre) return
  setTimeout(() => pre.classList.add('done'), 1200)
}

window.addEventListener('DOMContentLoaded', () => {
  runPreloader()
  attachTilt()

  const loginLink = document.getElementById('nav-login')
  const dashLink = document.getElementById('nav-dash')
  const logoutLink = document.getElementById('nav-logout')

  if (loginLink) loginLink.onclick = (e) => { e.preventDefault(); openModal() }

  if (localStorage.getItem('token')) {
    if (dashLink) dashLink.style.display = 'inline'
    if (loginLink) loginLink.style.display = 'none'
    if (logoutLink) { logoutLink.style.display = 'inline'; logoutLink.onclick = (e) => { e.preventDefault(); logout() } }
  }
})