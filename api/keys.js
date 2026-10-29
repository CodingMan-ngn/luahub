// language: JavaScript, file: api/keys.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'Slug required' });

    // Generate a random 24-char key
    const key_string = 'LH-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const { data, error } = await supabase
      .from('keys')
      .insert({
        key_string,
        script_slug: slug,
        owner_id: user.id,
        remaining_time: 86400, // Default 24 hours if you use time-based keys
        max_time: 86400
      })
      .select('key_string')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ key: data.key_string });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};