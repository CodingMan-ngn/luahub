// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  // Fetch script directly by slug
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !script) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Script not found');
  }

  // Bump hits (non-blocking)
  supabase
    .from('scripts')
    .update({ hits: (script.hits || 0) + 1 })
    .eq('id', script.id)
    .then(() => {})
    .catch(() => {});

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Serve the raw content directly
  return res.status(200).send(script.content_enc);
};