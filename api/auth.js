const { supabase } = require('./_supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  const { code, action } = req.query;

  if (action === 'login' && !code) {
    const redirectUri = `https://lua-axon.vercel.app/api/auth?action=callback`;
    const scope = 'identify guilds guilds.members.read';
    return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`);
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
      
      if (!guildRes.ok) {
        // NOT IN SERVER
        return res.redirect('/?error=not_in_server');
      }

      const guildData = await guildRes.json();
      const roles = guildData.roles || [];

      const isDev = process.env.DISCORD_DEV_ROLE_ID ? roles.includes(process.env.DISCORD_DEV_ROLE_ID) : false;
      
      // Must have verified role OR dev role
      const isVerified = process.env.DISCORD_ROLE_ID ? roles.includes(process.env.DISCORD_ROLE_ID) : false;
      if (!isVerified && !isDev) {
        return res.redirect('/?error=missing_role');
      }

      const sessionId = crypto.randomBytes(32).toString('hex');
      
      await supabase.from('sessions').insert({
        user_id: sessionId,
        discord_name: user.username,
        discord_avatar: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
        is_dev: isDev
      });

      res.setHeader('Set-Cookie', `luahub_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
      return res.redirect('/dashboard');

    } catch (err) {
      return res.redirect('/?error=auth_failed');
    }
  }

  if (action === 'check') {
    const match = (req.headers.cookie || '').match(/luahub_session=([^;]+)/);
    if (!match) return res.status(200).json({ loggedIn: false });

    const { data } = await supabase.from('sessions').select('*').eq('user_id', match[1]).single();
    if (!data) return res.status(200).json({ loggedIn: false });

    return res.status(200).json({ loggedIn: true, name: data.discord_name, avatar: data.discord_avatar, isDev: data.is_dev });
  }

  if (action === 'logout') {
    res.setHeader('Set-Cookie', `luahub_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return res.redirect('/');
  }
};