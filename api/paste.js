// language: JavaScript, file: api/paste.js
const { supabase } = require('./_supabase');
const { obfuscateLua } = require('../lib/obfuscator');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { name, content, show_intro, is_private, slug, obfuscate } = req.body;
      
      if (!name || !content) {
        return res.status(400).json({ error: 'Name and content are required.' });
      }

      // --- AUTO OBFUSCATION ---
      let finalContent = content;
      if (obfuscate) {
        try {
          finalContent = obfuscateLua(content);
        } catch (obfErr) {
          console.error("Auto-Obfuscation Error:", obfErr);
          return res.status(500).json({ error: 'Failed to obfuscate the script.' });
        }
      }

      if (slug) {
        // --- UPDATE EXISTING PASTE ---
        const { data, error } = await supabase
          .from('scripts')
          .update({ 
            name: name, 
            content_enc: finalContent, 
            show_intro: show_intro !== false,
            is_private: !!is_private,
            obf_method: obfuscate ? 'vm' : 'integrated'
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
            content_enc: finalContent,
            is_public: true,
            show_intro: show_intro !== false,
            is_private: !!is_private,
            requires_key: false,
            obf_method: obfuscate ? 'vm' : 'integrated'
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