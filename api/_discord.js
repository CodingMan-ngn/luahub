const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

module.exports = async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('No code provided');

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = `${process.env.SITE_URL}/api/auth`;

  try {
    // 1. Exchange code for Discord access token
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

    // 3. Upsert user in 'sessions' table
    const userId = discordUser.id;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/${discordUser.discriminator % 5}.png`;

    const { data: session, error } = await supabase
      .from('sessions')
      .upsert({
        user_id: userId,
        discord_name: discordUser.username,
        discord_avatar: avatarUrl
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;

    // 4. Sign custom JWT with their session data
    const token = jwt.sign(
      { id: session.user_id, is_dev: session.is_dev, name: session.discord_name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // 5. Redirect to dashboard with token in URL (handled by client)
    res.redirect(`/dashboard?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Authentication failed');
  }
};