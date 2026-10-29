export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { accessToken } = req.body;
  if (!accessToken) return res.status(401).json({ error: 'No token provided' });

  try {
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString());
    const discordId = payload.provider_id || payload.user_metadata?.provider_id;
    if (!discordId) return res.status(401).json({ error: 'No Discord ID found in token' });

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;
    
    // 1. The role required to even use the site (Verified)
    const verifiedRole = process.env.DISCORD_ROLE_ID || "1565200088593203350"; 
    
    // 2. The role required to upload scripts and set up keys (Developer)
    const devRole = process.env.DISCORD_DEV_ROLE_ID; 

    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}`, {
      headers: { Authorization: `Bot ${botToken}` }
    });

    if (discordRes.status === 404) return res.status(403).json({ error: 'You are not in the required Discord server.' });
    if (!discordRes.ok) throw new Error('Discord API Error');

    const memberData = await discordRes.json();
    
    // Check roles
    const isVerified = memberData.roles.includes(verifiedRole);
    const isDev = devRole ? memberData.roles.includes(devRole) : false;

    // If they don't even have the verified role, block them entirely from the site
    if (!isVerified && !isDev) {
        return res.status(403).json({ error: 'You need the Verified role to access LuaHub.' });
    }

    return res.status(200).json({ success: true, isDev: isDev });
  } catch (err) {
    return res.status(500).json({ error: 'Internal verification error' });
  }
}