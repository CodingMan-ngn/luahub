// language: JavaScript, file: api/scripts.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  // 1. FORCE JSON HEADERS IMMEDIATELY
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 2. GET: Fetch public feed or user's scripts
  if (req.method === 'GET') {
    try {
      const user = authUser(req);
      const { mine } = req.query;

      let query = supabase
        .from('scripts')
        .select('id, name, description, slug, hits, is_private, created_at, requires_key')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (mine && user) {
        query = query.eq('owner_id', user.id);
      } else {
        query = query.eq('is_private', false);
      }

      const { data, error } = await query.limit(50);
      
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 3. DELETE: Soft-delete a script
  if (req.method === 'DELETE') {
    try {
      const { slug } = req.query;
      const user = authUser(req);
      
      if (!slug) return res.status(400).json({ error: 'Slug required' });
      if (!user) return res.status(401).json({ error: 'Unauthorized' });

      const { error } = await supabase
        .from('scripts')
        .update({ is_deleted: true })
        .eq('slug', slug)
        .eq('owner_id', user.id);

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};