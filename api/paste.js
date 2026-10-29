// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, content, show_intro } = req.body;
      
      if (!name || !content) return res.status(400).json({ error: 'Name and content required.' });

      const slug = Math.random().toString(36).substring(2, 10);

      const { data, error } = await supabase
        .from('scripts')
        .insert({
          owner_id: null,
          name: name,
          slug: slug,
          content_enc: content,
          is_public: true,
          show_intro: show_intro !== false,
          requires_key: false,
          obf_method: 'integrated'
        })
        .select('slug')
        .single();

      if (error) {
        console.error("DB Insert Error:", error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ 
        slug: data.slug,
        loader_url: `/api/loader/${data.slug}`
      });

    } catch (err) {
      console.error("Paste Server Error:", err);
      return res.status(500).json({ error: err.message || 'Server crash' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};