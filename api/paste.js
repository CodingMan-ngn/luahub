// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, content, show_intro, is_private, slug } = req.body;
      if (!name || !content) return res.status(400).json({ error: 'Name and content required.' });

      if (slug) {
        // UPDATE
        const { data, error } = await supabase
          .from('scripts')
          .update({ name, content_enc: content, show_intro: show_intro !== false, is_private: !!is_private })
          .eq('slug', slug)
          .select('slug')
          .single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ slug: data.slug, updated: true });
      } else {
        // CREATE
        const newSlug = Math.random().toString(36).substring(2, 10);
        const { data, error } = await supabase
          .from('scripts')
          .insert({
            owner_id: null,
            name,
            slug: newSlug,
            content_enc: content,
            is_public: true,
            show_intro: show_intro !== false,
            is_private: !!is_private,
            requires_key: false,
            obf_method: 'integrated'
          })
          .select('slug')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ slug: data.slug, loader_url: `/api/loader/${data.slug}` });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};