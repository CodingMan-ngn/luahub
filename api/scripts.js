const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7);
}

function authUser(req) {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, description, slug, hits, created_at, requires_key, users(username)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { name, description, content, is_public, requires_key } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    const slug = slugify(name);
    const { data, error } = await supabase
      .from('scripts')
      .insert({ 
        owner_id: user.id, 
        name, 
        description, 
        slug, 
        content_enc: content, 
        is_public: is_public !== false,
        requires_key: requires_key === true // Defaults to false if undefined
      })
      .select('id, slug')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ slug: data.slug, loader_url: `/api/loader/${data.slug}` });
  }

  return res.status(405).json({ error: 'method not allowed' });
};