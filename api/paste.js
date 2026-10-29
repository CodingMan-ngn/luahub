// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');
const { obfuscateLua } = require('../lib/obfuscator');
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
    try {
      const { name, description, content, place_id, requires_key, obfuscate } = req.body;
      const user = authUser(req);
      
      if (!name || !content) return res.status(400).json({ error: 'Name and content required.' });

      let finalContent = content;
      if (obfuscate) finalContent = obfuscateLua(content);

      const newSlug = Math.random().toString(36).substring(2, 10);
      const { data, error } = await supabase
        .from('scripts')
        .insert({
          owner_id: user ? user.id : null, 
          name,
          description,
          slug: newSlug,
          content_enc: finalContent,
          is_public: true,
          requires_key: !!requires_key,
          place_id: place_id || 'universal',
          obf_method: 'integrated'
        })
        .select('slug')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ slug: data.slug });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};