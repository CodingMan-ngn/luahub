const { supabase } = require('./_supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // ... (Session check omitted for brevity) ...

  if (req.method === 'POST') {
    const session = await getSession();
    if (!session || !session.is_dev) return res.status(403).json({ error: 'Dev access required' });

    const { name, content, is_public, requires_key, is_updating } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + crypto.randomBytes(3).toString('hex');

    const { error } = await supabase.from('scripts').insert({
      owner_name: session.discord_name,
      name, slug, content_enc: content,
      is_public: !!is_public,
      requires_key: !!requires_key,
      is_updating: !!is_updating
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ slug });
  }
};