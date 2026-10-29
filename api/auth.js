const { supabase } = require('./_supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { code, action } = req.query;

  if (action === 'login' && !code) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = `https://lua-axon.vercel.app/api/auth?action=callback`;
    const scope = 'identify guilds guilds.members.read';
    
    return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`);
  }

  if (action === 'callback' && code) {
    try {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: process.env.DISCORD_CLIENT_ID,
          client_secret: process.env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: `https://lua-axon.vercel.app/api/auth?action=callback`,
        }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      const tokenData = await tokenRes.json();
      if (tokenData.error) throw new Error(tokenData.error);

      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const user = await userRes.json();

      const guildRes = await fetch(`https://discord.com/api/users/@me/guilds/${process.env.DISCORD_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      
      let roles = [];
      if (guildRes.ok) {
        const guildData = await guildRes.json();
        roles = guildData.roles || [];
      }

      const isDev = process.env.DISCORD_DEV_ROLE_ID ? roles.includes(process.env.DISCORD_DEV_ROLE_ID) : false;
      const isVerified = process.env.DISCORD_ROLE_ID ? roles.includes(process.env.DISCORD_ROLE_ID) : false;

      const sessionId = crypto.randomBytes(32).toString('hex');
      
      await supabase.from('sessions').insert({
        user_id: sessionId,
        discord_name: user.username,
        discord_avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
        is_dev: isDev,
        is_verified: isVerified
      });

      res.setHeader('Set-Cookie', `luahub_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      return res.redirect('/dashboard');

    } catch (err) {
      console.error(err);
      return res.redirect('/?error=auth_failed');
    }
  }

  if (action === 'check') {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/luahub_session=([^;]+)/);
    const sessionId = match ? match[1] : null;
    
    if (!sessionId) return res.status(200).json({ loggedIn: false });

    const { data } = await supabase.from('sessions').select('*').eq('user_id', sessionId).single();
    if (!data) return res.status(200).json({ loggedIn: false });

    return res.status(200).json({ 
      loggedIn: true, 
      name: data.discord_name, 
      avatar: data.discord_avatar,
      isDev: data.is_dev,
      isVerified: data.is_verified
    });
  }

  if (action === 'logout') {
    res.setHeader('Set-Cookie', `luahub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return res.redirect('/');
  }

  return res.status(400).send('Invalid request');
};