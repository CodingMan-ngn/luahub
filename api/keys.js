const { supabase } = require('./_supabase');
const crypto = require('crypto');

function generateKeyString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result + 'Inv';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { action, key_string, slug } = req.body;

    // 1. GENERATE KEY (Called after user completes BoostyLink)
    if (action === 'generate') {
      // In a real scenario, verify the BoostyLink session here.
      // For now, assume the frontend sends the slug they want a key for.
      
      const newKey = generateKeyString();
      const maxTime = 600; // Default 10 minutes (600 seconds) of runtime
      
      const { error } = await supabase
        .from('keys')
        .insert({
          key_string: newKey,
          script_slug: slug,
          remaining_time: maxTime,
          max_time: maxTime
        });

      if (error) return res.status(500).json({ error: 'Failed to save key.' });
      
      return res.status(200).json({ key: newKey, time: maxTime });
    }

    // 2. VERIFY KEY (Called by the executor loader)
    if (action === 'verify') {
      if (!key_string || !slug) return res.status(400).json({ error: 'missing fields' });

      const { data: keyData, error } = await supabase
        .from('keys')
        .select('*')
        .eq('key_string', key_string)
        .eq('script_slug', slug)
        .single();

      if (error || !keyData) return res.status(403).json({ error: 'Invalid key for this script.' });

      if (keyData.remaining_time <= 0) {
        return res.status(403).json({ error: 'Key time expired.' });
      }

      // Deduct 1 second of time (simulating a tick)
      // If they are offline, it still deducts when they try to run it.
      const newTime = keyData.remaining_time - 1;

      await supabase
        .from('keys')
        .update({ remaining_time: newTime })
        .eq('id', keyData.id);

      return res.status(200).json({ 
        status: 'success', 
        remaining: newTime 
      });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
};