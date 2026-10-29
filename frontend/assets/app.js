const SUPABASE_URL = 'https://cnwpjepbipnqirgdrque.supabase.co'

// 1. Discord Login
function loginDiscord() {
  const redirectUrl = window.location.origin + '/dashboard';
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=discord&redirect_to=${encodeURIComponent(redirectUrl)}`
}

// 2. Check Login State
function checkLogin() {
  const token = localStorage.getItem('token');
  const loginBtn = document.getElementById('login-btn');
  const dashBtn = document.getElementById('nav-dash');
  
  if (token) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (dashBtn) dashBtn.style.display = 'block';
  }
}

// 3. Key System Logic (Mock Linkvertise)
// In a real app, you would redirect to Linkvertise, get the callback, and verify.
// Here we simulate the generation for the UI.
function getKey() {
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = 'Redirecting to provider...';
  
  setTimeout(() => {
    // Generate a random 16-char key
    const key = Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    btn.textContent = 'Completed! Key Received';
    btn.style.background = '#10b981';
    
    document.getElementById('key-display').classList.remove('hidden');
    document.getElementById('key-text').textContent = key;
    
    // Save locally so they can copy it
    localStorage.setItem('luahub_key', key);
  }, 2500); // 2.5 second delay to simulate ad redirect
}

// 4. Fetch and Render Scripts
let allScripts = [];

async function fetchScripts() {
  const grid = document.getElementById('script-grid');
  try {
    const res = await fetch('/api/scripts');
    allScripts = await res.json();
    
    // Update stats
    document.getElementById('stat-scripts').textContent = allScripts.length;
    let totalHits = allScripts.reduce((sum, s) => sum + (s.hits || 0), 0);
    document.getElementById('stat-hits').textContent = totalHits;

    if (!allScripts.length) {
      grid.innerHTML = '<p style="color: var(--muted); grid-column: 1/-1; text-align: center;">No scripts uploaded yet.</p>';
      return;
    }
    renderGrid(allScripts);
  } catch (e) {
    grid.innerHTML = '<p style="color: #ef4444; grid-column: 1/-1; text-align: center;">Failed to load scripts.</p>';
  }
}

function renderGrid(scripts) {
  const grid = document.getElementById('script-grid');
  grid.innerHTML = scripts.map(s => {
    const url = `${window.location.origin}/api/loader/${s.slug}`;
    const loader = `loadstring(game:HttpGet("${url}"))()`;
    return `
      <div class="script-card">
        <div class="script-header">
          <div class="script-title">${s.name}</div>
          <div class="script-author">by ${s.users?.username || 'Anon'}</div>
        </div>
        <div class="script-meta">
          <span>👁 ${s.hits || 0} Executions</span>
          <span>📅 ${new Date(s.created_at).toLocaleDateString()}</span>
        </div>
        <div class="script-code" onclick="navigator.clipboard.writeText('${loader.replace(/'/g, "\\'")}'); alert('Copied loader URL!')" title="Click to copy" style="cursor:pointer;">
          ${loader}
        </div>
      </div>
    `;
  }).join('');
}

function filterScripts() {
  const query = document.getElementById('search-input').value.toLowerCase();
  const filtered = allScripts.filter(s => s.name.toLowerCase().includes(query));
  renderGrid(filtered);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkLogin();
  fetchScripts();
});