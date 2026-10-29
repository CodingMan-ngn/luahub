// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');
const crypto = require('crypto');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20) + '-' + crypto.randomBytes(3).toString('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { name, content, obf_method } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name and content required' });

    // Rate limiting (Crude global limit: 100 pastes per hour)
    const { count } = await supabase
      .from('scripts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (count > 100) {
      return res.status(429).json({ error: 'Too many pastes recently. Try again later.' });
    }

    const slug = slugify(name);

    // Insert without an owner_id (Anonymous)
    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_id: null,
        name: name,
        slug: slug,
        content_enc: content,
        is_public: true,
        requires_key: false, // Anonymous pastes cannot use the key system
        obf_method: obf_method || 'integrated'
      })
      .select('slug')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    
    return res.status(200).json({ 
      slug: data.slug,
      loader_url: `/api/loader/${data.slug}`
    });
  }

  return res.status(405).json({ error: 'method not allowed' });
};