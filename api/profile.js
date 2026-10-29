const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  const { data: me } = await supabase
    .from('users').select('id, username, role, verified, bio, avatar_url').eq('id', user.id).single();
  if (!me) return res.status(404).json({ error: 'not found' });

  if (req.method === 'GET') {
    const { data: scripts } = await supabase
      .from('scripts').select('id, name, slug, hits, obf_method, requires_key, created_at')
      .eq('owner_id', user.id).order('created_at', { ascending: false });
    return res.status(200).json({ profile: me, scripts: scripts || [] });
  }

  if (req.method === 'PATCH') {
    if (!me.verified) return res.status(403).json({ error: 'profile edit requires verified role' });
    const { bio, avatar_url } = req.body;
    const { error } = await supabase
      .from('users').update({ bio, avatar_url }).eq('id', user.id);
    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
};