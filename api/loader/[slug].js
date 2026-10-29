const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug, key } = req.query; 
  const { data } = await supabase.from('scripts').select('*').eq('slug', slug).single();

  if (!data) return res.status(404).send('-- Script not found');
  if (data.is_updating) return res.status(503).send('-- Updating');
  
  if (data.requires_key) {
    if (!key) return res.status(403).send('-- Key required');
    
    try {
      // 1. Check if the key is valid with BoostyLink
      const bslRes = await fetch(`https://boostylink.com/api/v1/completions/${key}`, {
        headers: { 
          'Authorization': `Bearer ${process.env.BOOSTYLINK_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (!bslRes.ok) {
        return res.status(403).send('-- Invalid or expired key');
      }
      
      // 2. ANTI-BYPASS: Consume the key so it cannot be reused
      const consumeRes = await fetch(`https://boostylink.com/api/v1/completions/${key}/consume`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${process.env.BOOSTYLINK_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      if (!consumeRes.ok) {
        // If consumption fails, it might have already been used.
        return res.status(403).send('-- Key has already been used.');
      }

    } catch (e) {
      return res.status(500).send('-- Gateway verification error');
    }
  }

  await supabase.from('scripts').update({ hits: data.hits + 1 }).eq('slug', slug);
  res.setHeader('Content-Type', 'text/plain');
  return res.send(data.content_enc);
};