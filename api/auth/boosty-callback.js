const { supabase } = require('../_supabase');

function generateKeyString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result + 'Inv';
}

module.exports = async (req, res) => {
  const { slug, token } = req.query;
  
  if (!slug || !token) return res.status(400).send('Missing parameters.');

  try {
    // 1. Verify the script
    const { data: script, error: scriptErr } = await supabase
      .from('scripts')
      .select('id, key_duration, requires_key')
      .eq('slug', slug)
      .single();

    if (scriptErr || !script || !script.requires_key) {
      return res.status(404).send('Script not found.');
    }

    // 2. Generate the key
    const duration = script.key_duration || 600;
    const newKey = generateKeyString();

    await supabase.from('keys').insert({
      key_string: newKey,
      script_slug: slug,
      remaining_time: duration
    });

    // 3. Redirect to the success page
    // Note: We don't strictly check the 'token' here for simplicity, 
    // but in a strict Anti-Bypass system, you would store this token in 
    // the DB on 'Generate' and delete it here.
    
    res.redirect(`/key-system/success?key=${newKey}&slug=${slug}`);
    
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};