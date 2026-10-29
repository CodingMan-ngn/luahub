const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;
  const { key } = req.query; 

  const { data, error } = await supabase
    .from('scripts')
    .select('content_enc, hits, requires_key')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !data) return res.status(404).send('-- script not found');

  // Key Validation Logic
  if (data.requires_key) {
    if (!key) {
      // The Lua loader searches for this exact string to trigger the UI
      return res.status(403).send('-- Key required. Please generate one via BoostyLink.'); 
    }
    
    // Optional: Add a database check here if you want to whitelist generated keys
    if (key.length < 8) {
      return res.status(403).send('-- error: Invalid key format.');
    }
  }

  // Increment hits
  await supabase.from('scripts').update({ hits: data.hits + 1 }).eq('slug', slug);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(data.content_enc);
};