const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  if (req.method === 'GET') {
    const { data: me } = await supabase
      .from('sessions').select('*').eq('user_id', user.id).single();
    
    if (!me) return res.status(404).json({ error: 'not found' });
    return res.status(200).json({ profile: me });
  }

  if (req.method === 'DELETE') {
    // Delete user from sessions table.
    // ON DELETE CASCADE in the schema will automatically wipe their scripts and keys.
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
};