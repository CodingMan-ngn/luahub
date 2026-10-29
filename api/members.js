const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Get last 10 registered users
    const { data, error } = await supabase
      .from('sessions')
      .select('user_id, discord_name, discord_avatar, is_dev, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};