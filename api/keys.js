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

  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // --- GET: Fetch user's keys ---
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // --- POST: Generate a new key ---
  if (req.method === 'POST') {
    const { slug, duration, destination_url } = req.body;
    if (!slug) return res.status(400).json({ error: 'Script slug required' });

    // Verify ownership
    const { data: script } = await supabase.from('scripts').select('owner_id').eq('slug', slug).single();
    if (!script || script.owner_id !== user.id) return res.status(403).json({ error: 'You do not own this script.' });

    const key_string = 'LH-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expires_at = duration === 999 ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('keys')
      .insert({
        key_string,
        script_slug: slug,
        created_by: user.id,
        destination_url: destination_url || null,
        expires_at: expires_at,
        remaining_time: duration,
        max_time: duration
      })
      .select('key_string')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ key: data.key_string });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};