const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${process.env.SITE_URL}/api/auth`;

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Discord token exchange failed');

    // 2. Fetch Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();
    const userId = discordUser.id;

    // 3. Check Roles via Bot Token
    let isVerified = false;
    let isDev = false;
    try {
      const guildRes = await fetch(`https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
      });
      if (guildRes.ok) {
        const memberData = await guildRes.json();
        const roles = memberData.roles || [];
        isVerified = roles.includes(process.env.DISCORD_ROLE_ID);
        isDev = roles.includes(process.env.DISCORD_DEV_ROLE_ID);
      }
    } catch (e) {
      console.error("Role check failed", e);
    }

    // 4. Upsert into Supabase
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    const { data: session, error } = await supabase
      .from('sessions')
      .upsert({
        user_id: userId,
        discord_name: discordUser.username,
        discord_avatar: avatarUrl,
        is_dev: isDev // Store dev status in DB
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    // 5. Sign JWT with role data
    const token = jwt.sign(
      { 
        id: session.user_id, 
        name: session.discord_name, 
        avatar: session.discord_avatar,
        verified: isVerified,
        is_dev: isDev
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.redirect(`/dashboard?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Authentication failed');
  }
};