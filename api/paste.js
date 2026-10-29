// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, content, show_intro, slug } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required.' });
      }

      if (slug) {
        // --- UPDATE EXISTING PASTE ---
        const { data, error } = await supabase
          .from('scripts')
          .update({ 
            name: name, 
            content_enc: content, 
            show_intro: show_intro !== false 
          })
          .eq('slug', slug)
          .select('slug')
          .single();
          
        if (error) {
          console.error("DB Update Error:", error);
          return res.status(500).json({ error: error.message });
        }
        return res.status(200).json({ slug: data.slug, updated: true });
      } else {
        // --- CREATE NEW PASTE ---
        const newSlug = Math.random().toString(36).substring(2, 10);
        
        const { data, error } = await supabase
          .from('scripts')
          .insert({
            owner_id: null, // Anonymous
            name: name,
            slug: newSlug,
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
      }
    } catch (err) {
      console.error("Server Error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};