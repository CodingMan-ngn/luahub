const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug, key } = req.query;
  const { data } = await supabase.from('scripts').select('*').eq('slug', slug).single();

  if (!data) return res.status(404).send('-- Script not found');

  if (data.requires_key && !key) {
    return res.status(403).send('-- Key required'); 
  }

  if (data.requires_key && key) {
    // Verify key with BoostyLink
    const bslRes = await fetch(`https://boostylink.com/api/v1/verify?key=${key}`, {
      headers: { 'Authorization': `Bearer ${process.env.BOOSTYLINK_API_KEY}` }
    });
    if (!bslRes.ok) return res.status(403).send('-- Invalid or expired key');
  }

  await supabase.from('scripts').update({ hits: data.hits + 1 }).eq('slug', slug);
  res.setHeader('Content-Type', 'text/plain');
  return res.send(data.content_enc);
};