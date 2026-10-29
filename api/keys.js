const { supabase } = require('./_supabase');

function generateKeyString() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result + 'Inv';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { action, key_string, slug } = req.body;

    if (action === 'generate') {
      const { data: script } = await supabase.from('scripts').select('key_duration').eq('slug', slug).single();
      const duration = script?.key_duration || 600; 
      
      const newKey = generateKeyString();
      
      const { error } = await supabase
        .from('keys')
        .insert({
          key_string: newKey,
          script_slug: slug,
          remaining_time: duration
        });

      if (error) return res.status(500).json({ error: 'Failed to save key.' });
      return res.status(200).json({ key: newKey, time: duration });
    }

    if (action === 'verify') {
      if (!key_string || !slug) return res.status(400).json({ error: 'missing fields' });

      const { data: keyData, error } = await supabase
        .from('keys').select('*').eq('key_string', key_string).eq('script_slug', slug).single();

      if (error || !keyData) return res.status(403).json({ error: 'Invalid key for this script.' });
      if (keyData.remaining_time <= 0) return res.status(403).json({ error: 'Key time expired.' });

      // Deduct 1 second.
      const newTime = keyData.remaining_time - 1;
      await supabase.from('keys').update({ remaining_time: newTime }).eq('id', keyData.id);

      // Tell the UI how much time is left
      return res.status(200).json({ status: 'success', remaining: newTime });
    }
  }
  return res.status(405).json({ error: 'method not allowed' });
};