const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const getSession = async () => {
    const match = (req.headers.cookie || '').match(/luahub_session=([^;]+)/);
    if (!match) return null;
    const { data } = await supabase.from('sessions').select('*').eq('user_id', match[1]).single();
    return data;
  };

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase.from('scripts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(200).json([]); // Return empty array on error so site doesn't break
    }
  }

  if (req.method === 'POST') {
    const session = await getSession();
    if (!session || !session.is_dev) return res.status(403).json({ error: 'Dev access required' });

    const { name, content, source_code, is_public_source, requires_key, is_updating } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 6);
    
    const { error } = await supabase.from('scripts').insert({
      owner_name: session.discord_name,
      name, slug, content_enc: content,
      source_code: is_public_source ? source_code : null,
      is_public_source: !!is_public_source,
      requires_key: !!requires_key,
      is_updating: !!is_updating
    });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ slug });
  }
};