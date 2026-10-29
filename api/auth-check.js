export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { accessToken } = req.body;
  if (!accessToken) return res.status(401).json({ error: 'No token provided' });

  try {
    // 1. Get Discord ID from Supabase token
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
    const discordId = payload.provider_id || payload.user_metadata?.provider_id;
    if (!discordId) return res.status(401).json({ error: 'No Discord ID found in token' });

    // 2. Check Discord Server Member and Roles
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    const requiredRole = process.env.DISCORD_ROLE_ID;

    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    if (discordRes.status === 404) return res.status(403).json({ error: 'You are not in the required Discord server.' });
    if (!discordRes.ok) throw new Error('Discord API Error');

    const memberData = await discordRes.json();
    
    if (requiredRole && !memberData.roles.includes(requiredRole)) {
      return res.status(403).json({ error: 'You do not have the required Discord role.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal verification error' });
  }
}