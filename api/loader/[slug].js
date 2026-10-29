const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  const { data: script, error } = await supabase
    .from('scripts').select('*').eq('slug', slug).single();
    
  if (error || !script) return res.status(404).send('-- Script not found');

  if (script.requires_key) {
    const key = req.query.key || req.headers['x-script-key'];
    if (!key) return res.status(403).send('-- Key required');
    
    // Note: if you are using the BoostyLink API, put the fetch here.
    // For now, we just accept any key to let the loader work.
  }

  // Update hit counter
  await supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id);
  
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(script.content_enc);
};