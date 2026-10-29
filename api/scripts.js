// language: JavaScript, file: api/scripts.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // --- GET PUBLIC FEED ---
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, slug, hits, is_private, created_at')
      .eq('is_private', false) // ONLY PUBLIC SCRIPTS
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // --- DELETE SCRIPT ---
  if (req.method === 'DELETE') {
    const { slug } = req.query;
    if (!slug) return res.status(400).json({ error: 'Slug required' });

    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('slug', slug);
      
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
};