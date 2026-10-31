// language: JavaScript, file: api/index.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
// Add your Discord Client ID and Secret to Vercel Env Vars!
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://lua-axon.vercel.app/api/auth';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// ... (Keep the randomHex, xorEncodeHex, obfuscateLua functions from previous prompt here) ...

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const urlParts = req.url.split('?')[0].split('/');
  const route = urlParts[urlParts.length - 1];

  try {
    // ==========================================
    // AUTH ROUTE (Discord OAuth)
    // ==========================================
    if (route === 'auth') {
      const { code } = req.query;
      if (!code) return res.status(400).send('No code provided');

      // Exchange code for token
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID, client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI
        })
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) return res.status(400).send('Auth failed');

      // Get user info
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userData = await userRes.json();

      // Save user to DB (Upsert)
      let { data: dbUser } = await supabase.from('users').select('*').eq('discord_id', userData.id).maybeSingle();
      if (!dbUser) {
        const { data: newUser } = await supabase.from('users').insert({ discord_id: userData.id, username: userData.username, avatar: userData.avatar }).select('*').single();
        dbUser = newUser;
      }

      // Generate JWT for our app
      const jwtToken = jwt.sign({ id: dbUser.id, username: dbUser.username }, JWT_SECRET, { expiresIn: '7d' });
      
      // Redirect back to dashboard with token
      return res.redirect(`/dashboard?token=${jwtToken}`);
    }

    // ==========================================
    // OTHER ROUTES (Keep your existing scripts/paste/keys/gateway logic here)
    // ==========================================
    if (route === 'scripts') { /* ... */ }
    if (route === 'paste') { /* ... */ }
    // etc...

    return res.status(404).json({ error: 'Route not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};