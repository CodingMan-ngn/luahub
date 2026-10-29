// language: JavaScript, file: api/loader/[slug].js, target: Vercel Node 20, CommonJS
const { supabase } = require('../_supabase');
const crypto = require('crypto');

const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

module.exports = async (req, res) => {
  const { slug } = req.query;
  const key = req.query.key || req.headers['x-script-key'];

  // Fetch script from Supabase
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (error || !script) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Script not found');
  }

  if (script.is_updating) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(503).send('-- Script is currently updating');
  }

  // Handle Key System (if enabled for this script)
  if (script.requires_key) {
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Key required');
    }

    const kh = hashKey(key);

    // Check if key was already used for this script
    const { data: existing } = await supabase
      .from('key_consumptions')
      .select('id')
      .eq('key_hash', kh)
      .eq('script_id', script.id)
      .maybeSingle();

    if (existing) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Key already used for this script');
    }

    // Verify with BoostyLink
    try {
      const v = await fetch(`https://boostylink.com/api/v1/completions/${key}`, {
        headers: {
          Authorization: `Bearer ${process.env.BOOSTYLINK_API_KEY}`,
          Accept: 'application/json'
        }
      });
      if (!v.ok) {
        res.setHeader('Content-Type', 'text/plain');
        return res.status(403).send('-- Invalid or expired key');
      }
    } catch {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(500).send('-- Gateway verification error');
    }

    // Record consumption (unique constraint prevents race condition double-spend)
    const { error: insErr } = await supabase
      .from('key_consumptions')
      .insert({ key_hash: kh, script_id: script.id });

    if (insErr) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Key already used for this script');
    }
  }

  // Bump hits (non-blocking)
  supabase
    .from('scripts')
    .update({ hits: (script.hits || 0) + 1 })
    .eq('id', script.id)
    .then(() => {})
    .catch(() => {});

  // Determine how to serve the content
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');

  // If the script was generated via raw paste, it won't have the XOR encryption.
  // We check the obf_method. If it's 'integrated' or doesn't look like our specific
  // Base64+XOR payload, we serve it exactly as pasted.
  if (script.obf_method === 'integrated' || script.obf_method === 'vm') {
    // Raw Lua source
    return res.status(200).send(script.content_enc);
  }

  // For 'loader' (XOR/Base64) method, serve the encoded blob.
  // The client-side loader.lua will decrypt this.
  return res.status(200).send(script.content_enc);
};