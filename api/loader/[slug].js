const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  const { data: script, error } = await supabase
    .from('scripts').select('*').eq('slug', slug).single();
    
  if (error || !script) return res.status(404).send('-- Script not found');

  // Basic key check (if required) — using boostylink logic as before
  if (script.requires_key) {
    const key = req.query.key || req.headers['x-script-key'];
    if (!key) return res.status(403).send('-- Key required');
    try {
      const v = await fetch(`https://boostylink.com/api/v1/completions/${key}`, {
        headers: { Authorization: `Bearer ${process.env.BOOSTYLINK_API_KEY}`, Accept: 'application/json' }
      });
      if (!v.ok) return res.status(403).send('-- Invalid or expired key');
    } catch {
      return res.status(500).send('-- Gateway verification error');
    }
  }

  await supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id);
  
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(script.content_enc);
};