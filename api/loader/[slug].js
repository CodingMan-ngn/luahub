// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;
  
  // Get key from URL (?key=...) or Headers (x-script-key)
  const key = req.query.key || req.headers['x-script-key'];

  // 1. Fetch the script
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle(); // Use maybeSingle to prevent throwing an error if 0 rows

  if (error) {
    console.error("Supabase Error:", error);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('-- Database error: ' + error.message);
  }

  if (!script) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Script not found');
  }

  // 2. Developer Key Check
  if (script.requires_key) {
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Access Denied: Developer Key required.\n-- Append ?key=YOUR_KEY to the URL.');
    }

    // In a real setup, you would check this against a database.
    // For now, we allow any key that matches the script name or a universal dev key.
    if (key !== 'DEV_BYPASS' && key !== script.slug) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Access Denied: Invalid Key.');
    }
  }

  // 3. Bump hits
  supabase
    .from('scripts')
    .update({ hits: (script.hits || 0) + 1 })
    .eq('id', script.id)
    .then(() => {})
    .catch(() => {});

  // 4. Serve the script
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(script.content_enc);
};