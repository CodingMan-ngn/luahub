const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Helper to get session from cookie
  const getSession = async () => {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/luahub_session=([^;]+)/);
    if (!match) return null;
    const { data } = await supabase.from('sessions').select('*').eq('user_id', match[1]).single();
    return data;
  };

  if (req.method === 'GET') {
    // Public list of scripts
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, slug, hits, created_at, requires_key')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const session = await getSession();
    // Check if user is Dev
    if (!session || !session.is_dev) {
      return res.status(403).json({ error: 'Access Denied. Developer role required.' });
    }

    const { name, description, content, is_public, requires_key } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 6);
    
    const { data, error } = await supabase
      .from('scripts')
      .insert({ 
        owner_id: session.discord_name, 
        name, 
        description, 
        slug, 
        content_enc: content, 
        is_public: is_public !== false,
        requires_key: requires_key === true 
      })
      .select('id, slug')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({ slug: data.slug, loader_url: `/api/loader/${data.slug}` });
  }

  return res.status(405).json({ error: 'method not allowed' });
};