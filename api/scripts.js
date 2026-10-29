const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7);
}

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, slug, hits, requires_key, is_public_source, source_code, owner_name, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    // Strict backend enforcement: only developers can upload
    if (!user.is_dev) {
      return res.status(403).json({ error: 'Developer role required to upload scripts' });
    }

    const { name, content, is_public_source, source_code, requires_key } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    // Double check key system constraint just in case JWT was spoofed (though JWT is signed)
    if (requires_key && !user.is_dev) {
      return res.status(403).json({ error: 'Key system requires developer role' });
    }

    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_name: user.name,
        name,
        slug: slugify(name),
        content_enc: content,
        source_code: is_public_source ? source_code : null,
        is_public_source: !!is_public_source,
        requires_key: !!requires_key
      })
      .select('slug')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ slug: data.slug });
  }

  return res.status(405).json({ error: 'method not allowed' });
};