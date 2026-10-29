// language: JavaScript, file: api/keys.js
const { supabase } = require('./_supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'Slug required' });

    // 1. Fetch the script
    const { data: script } = await supabase.from('scripts').select('id').eq('slug', slug).single();
    if (!script) return res.status(404).json({ error: 'Script not found' });

    // 2. Update script to require key
    await supabase.from('scripts').update({ requires_key: true }).eq('id', script.id);

    // 3. Generate a random key
    const newKey = crypto.randomBytes(8).toString('hex').toUpperCase(); // e.g. A1B2C3D4

    // 4. Save to DB
    const { error } = await supabase.from('script_keys').insert({
      script_id: script.id,
      key_value: newKey
    });

    if (error) return res.status(500).json({ error: error.message });
    
    return res.status(200).json({ key: newKey });
  }
  return res.status(405).json({ error: 'Method not allowed' });
};