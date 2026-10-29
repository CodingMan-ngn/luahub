// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  // 1. Get slug from URL path (fixes the 'undefined' error)
  // Example URL: /api/loader/9vsyu6j6
  const parts = req.url.split('?')[0].split('/');
  let slug = parts[parts.length - 1]; 
  
  // If for some reason it's still using query parameters, catch it here
  if (!slug || slug === '[slug]') {
    slug = req.query.slug;
  }

  console.log("FETCHING SLUG:", slug); 

  // 2. Fetch the script from Supabase
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle(); 

  if (error) {
    console.error("DB ERROR:", error);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('-- Database error: ' + error.message);
  }
  
  if (!script) {
    console.log("SCRIPT NOT FOUND IN DB");
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Script not found');
  }

  // 3. Bump hits
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});

  // 4. Serve the script
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(script.content_enc);
};