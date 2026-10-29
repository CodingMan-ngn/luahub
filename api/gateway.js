// language: JavaScript, file: api/gateway.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 1. User clicks "START" -> Generate a pending key and a token
  if (req.method === 'POST' && req.body.action === 'start') {
    const { slug } = req.body;
    
    // Generate a unique token for the URL
    const gateway_token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const key_string = 'LH-' + Math.random().toString(36).substring(2, 15).toUpperCase();
    
    // Set 48 hour max duration (or whatever you want as default)
    const expires_at = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); 

    const { error } = await supabase.from('keys').insert({
      key_string,
      script_slug: slug,
      gateway_token,
      is_used: false,
      expires_at,
      remaining_time: 48,
      max_time: 48
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ token: gateway_token });
  }

  // 2. User lands back on the page with the token -> Validate and give the key
  if (req.method === 'POST' && req.body.action === 'claim') {
    const { token } = req.body;
    
    const { data: keyData, error } = await supabase
      .from('keys')
      .select('key_string, script_slug, expires_at')
      .eq('gateway_token', token)
      .single();

    if (error || !keyData) return res.status(404).json({ error: 'Invalid or expired token.' });

    // Mark as used so they can't just refresh the page to get it again (optional, but good practice)
    await supabase.from('keys').update({ is_used: true }).eq('gateway_token', token);

    return res.status(200).json({ key: keyData.key_string, slug: keyData.script_slug });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};