// language: JavaScript, file: api/scripts.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- GET: Public Feed OR User's Scripts ---
  if (req.method === 'GET') {
    const user = authUser(req);
    const { mine } = req.query; // If ?mine=true, fetch only user's scripts

    let query = supabase
      .from('scripts')
      .select('id, name, slug, hits, is_private, created_at, requires_key')
      .order('created_at', { ascending: false });

    if (mine && user) {
      query = query.eq('owner_id', user.id); // Fetch only logged-in user's scripts
    } else {
      query = query.eq('is_private', false); // Public feed
    }

    const { data, error } = await query.limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // --- DELETE SCRIPT ---
  if (req.method === 'DELETE') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug required' });
    const { error } = await supabase.from('scripts').delete().eq('slug', slug);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};