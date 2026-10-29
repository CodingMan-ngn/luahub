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

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const discordUser = await userRes.json();

    const userId = discordUser.id;
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${userId}/${discordUser.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    // Upsert into sessions table
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

    const token = jwt.sign(
      { id: session.user_id, is_dev: session.is_dev, name: session.discord_name, avatar: session.discord_avatar },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.redirect(`/dashboard?token=${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Authentication failed');
  }
};