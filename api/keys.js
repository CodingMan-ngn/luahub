const { supabase } = require('./_supabase');
const crypto = require('crypto');

function generateKeyString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result + 'Inv';
}

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { action, slug, token } = req.body;

    // 1. GENERATE SESSION TOKEN (Before they go to Linkvertise)
    if (action === 'start') {
      const newToken = generateToken();
      await supabase.from('key_sessions').insert({
        token: newToken,
        script_slug: slug
      });
      
      // The frontend will append this token to the Linkvertise URL
      return res.status(200).json({ token: newToken });
    }

    // 2. VERIFY TOKEN AND GENERATE KEY (When they return)
    if (action === 'claim') {
      if (!token || !slug) return res.status(400).json({ error: 'Missing token or slug' });

      // Check if token exists and is not used
      const { data: session, error } = await supabase
        .from('key_sessions')
        .select('*')
        .eq('token', token)
        .eq('script_slug', slug)
        .eq('used', false)
        .single();

      if (error || !session) {
        return res.status(403).json({ error: 'Invalid or expired session. Please restart.' });
      }

      // ANTI-BYPASS: Check time elapsed (Must be at least 15 seconds)
      const createdAt = new Date(session.created_at).getTime();
      const now = new Date().getTime();
      if (now - createdAt < 15000) {
        return res.status(403).json({ error: 'You completed the ads too fast. Please wait.' });
      }

      // Mark token as used
      await supabase.from('key_sessions').update({ used: true }).eq('id', session.id);

      // Generate the actual key
      const { data: script } = await supabase.from('scripts').select('key_duration').eq('slug', slug).single();
      const duration = script?.key_duration || 600;
      const newKey = generateKeyString();

      await supabase.from('keys').insert({
        key_string: newKey,
        script_slug: slug,
        remaining_time: duration
      });

      return res.status(200).json({ key: newKey });
    }
  }
  return res.status(405).json({ error: 'method not allowed' });
};