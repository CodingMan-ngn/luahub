const SUPABASE_URL = 'https://cnwpjepbipnqirgdrque.supabase.co'

// 1. Capture OAuth Token
;(function captureToken() {
  if (window.location.hash && window.location.hash.includes('access_token')) {
    const params = new URLSearchParams(window.location.hash.substring(1))
    const token = params.get('access_token')
    if (token) {
      localStorage.setItem('token', token)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        localStorage.setItem('username', payload?.user_metadata?.full_name || 'User')
      } catch {}
      window.history.replaceState(null, '', window.location.pathname)
    }
  }
})()

function loginDiscord() {
  const redirectUrl = window.location.origin + '/dashboard';
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`
}

// 2. Scroll Reveal Animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('active') })
}, { threshold: 0.1 })

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el))

  // If user is already logged in, change nav button to Dashboard
  if (localStorage.getItem('token')) {
    const loginBtn = document.getElementById('nav-login');
    if (loginBtn) {
      loginBtn.textContent = 'Dashboard';
      loginBtn.href = '/dashboard';
    }
  }
})

// 3. Page Specific Logic
const isDashboard = window.location.pathname.includes('dashboard');

if (isDashboard) {
  const token = localStorage.getItem('token');
  
  // Kick to Discord if not logged in
  if (!token) {
    loginDiscord();
  } else {
    // Verify Discord Role Access
    document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;color:white;font-family:sans-serif;">Verifying Server Access...</div>';
    
    fetch('/api/auth-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token })
    })
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok) {
        localStorage.clear();
        alert(data.error || 'Access Denied: You do not have the required Discord role.');
        window.location.href = '/';
      } else {
        window.location.reload(); // Reload to render the actual dashboard HTML
      }
    })
    .catch(() => {
      alert('Error verifying access.');
      window.location.href = '/';
    });
  }
}