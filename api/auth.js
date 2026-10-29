// language: JavaScript, file: api/auth.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1565187874767507468';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = "https://lua-axon.vercel.app/api/auth"; 

module.exports = async (req, res) => {
  if (req.method === 'GET' && req.query.code) {
    const code = req.query.code;

    try {
      // 1. Exchange code for access token
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const tokenData = await tokenResponse.json();
      if (!tokenData.access_token) throw new Error('Discord token failed');

      // 2. Fetch Discord User
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userData = await userResponse.json();

      // 3. Generate Fingerprint (SHA-256 of Discord ID)
      const fingerprint = crypto.createHash('sha256').update(userData.id).digest('hex');

      // 4. Upsert User in DB
      let { data: dbUser } = await supabase
        .from('users').select('id, username, role, verified, fingerprint').eq('fingerprint', fingerprint).maybeSingle();

      if (!dbUser) {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert({
            username: userData.username,
            email: `${userData.id}@discord.local`, 
            password_hash: 'discord_oauth_login', 
            avatar_url: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`,
            fingerprint: fingerprint
          })
          .select('id, username, role, verified, fingerprint').single();
          
        if (error) throw new Error('DB Insert failed: ' + error.message);
        dbUser = newUser;
      }

      // 5. Generate JWT and redirect
      const token = jwt.sign({ id: dbUser.id, name: dbUser.username }, JWT_SECRET, { expiresIn: '30d' });
      return res.redirect(`/dashboard?token=${token}&username=${dbUser.username}`);

    } catch (err) {
      return res.status(500).json({ error: 'Discord auth failed: ' + err.message });
    }
  }
  return res.status(405).json({ error: 'method not allowed' });
};