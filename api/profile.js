// language: JavaScript, file: api/profile.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('users').select('username, bio').eq('id', user.id).single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || { username: user.name });
  }

  if (req.method === 'POST') {
    const { username, bio } = req.body;
    const finalUsername = username ? username.trim() : user.name;
    
    const { error } = await supabase.from('users').update({ username: finalUsername, bio: bio || null }).eq('id', user.id);
    if (error) return res.status(500).json({ error: error.message });
    
    const newToken = jwt.sign({ id: user.id, name: finalUsername }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({ token: newToken, username: finalUsername });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};