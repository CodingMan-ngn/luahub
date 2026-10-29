const { supabase } = require('../_supabase');
const crypto = require('crypto');

const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

module.exports = async (req, res) => {
  const { slug } = req.query;
  const key = req.query.key || req.headers['x-script-key'];

  const { data: script, error } = await supabase
    .from('scripts').select('*').eq('slug', slug).eq('is_public', true).single();
  if (error || !script) return res.status(404).send('-- Script not found');
  if (script.is_updating) return res.status(503).send('-- Updating');

  if (script.requires_key) {
    if (!key) return res.status(403).send('-- Key required');
    const kh = hashKey(key);

    const { data: existing } = await supabase
      .from('key_consumptions').select('id')
      .eq('key_hash', kh).eq('script_id', script.id).maybeSingle();
    if (existing) return res.status(403).send('-- Key already used for this script');

    try {
      const v = await fetch(`https://boostylink.com/api/v1/completions/${key}`, {
        headers: { Authorization: `Bearer ${process.env.BOOSTYLINK_API_KEY}`, Accept: 'application/json' }
      });
      if (!v.ok) return res.status(403).send('-- Invalid or expired key');
    } catch {
      return res.status(500).send('-- Gateway verification error');
    }

    const { error: insErr } = await supabase
      .from('key_consumptions').insert({ key_hash: kh, script_id: script.id });
    if (insErr) return res.status(403).send('-- Key already used for this script');
  }

  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id)
    .then(() => {}).catch(() => {});

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(script.content_enc);
};