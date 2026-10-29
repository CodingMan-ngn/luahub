let globalSession = { loggedIn: false, isDev: false, isVerified: false };

async function checkSession() {
  try {
    const res = await fetch('/api/auth?action=check');
    const data = await res.json();
    if (data.loggedIn) globalSession = data;
  } catch (e) { console.error('Session check failed', e); }
  return globalSession;
}

// Initial Load
document.addEventListener('DOMContentLoaded', async () => {
  await checkSession();

  const loginBtn = document.getElementById('login-btn');
  const navProfile = document.getElementById('nav-profile');
  const navDash = document.getElementById('nav-dash');

  if (globalSession.loggedIn) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (navDash) navDash.style.display = 'inline-block';
    if (navProfile) {
      navProfile.style.display = 'flex';
      navProfile.innerHTML = `<img src="${globalSession.avatar}" style="width:28px;height:28px;border-radius:50%;margin-right:8px;border:2px solid #7c3aed;"><span style="font-weight:600;">${globalSession.name}</span>`;
    }
  }
});