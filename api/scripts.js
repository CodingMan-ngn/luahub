// language: JavaScript, file: api/scripts.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';
const VALID_METHODS = ['loader', 'bootstrapper', 'bytecode', 'integrated', 'vm'];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)
    + '-' + Math.random().toString(36).slice(2, 7);
}

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ---------- GET: public listing & dashboard ----------
  if (req.method === 'GET') {
    const user = authUser(req);
    
    // If logged in, show only their scripts. If not, show all public.
    let query = supabase
      .from('scripts')
      .select('id, name, description, slug, hits, obf_method, requires_key, created_at, users(username, verified)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (user) {
      query = query.eq('owner_id', user.id);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // ---------- POST: deploy from dashboard ----------
  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user) return res.status(401).json({ error: 'unauthorized' });

    const { name, description, content, is_public, requires_key, obf_method, vm_preset } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    const { data: dbUser, error: dbErr } = await supabase
      .from('users').select('role, verified').eq('id', user.id).single();
    if (dbErr || !dbUser) return res.status(401).json({ error: 'user gone' });

    const wantsKey = !!requires_key;
    if (wantsKey && dbUser.role !== 'developer') {
      return res.status(403).json({ error: 'key system requires developer role' });
    }

    const method = VALID_METHODS.includes(obf_method) ? obf_method : 'loader';

    let finalContent = content;
    if (method === 'vm') {
      try {
        // Shells out to your remote obfuscator API if configured
        const url = process.env.VM_OBF_URL;
        const token = process.env.VM_OBF_TOKEN;
        if (!url || !token) throw new Error('VM obfuscation server not configured');
        
        const r = await fetch(url.replace(/\/$/, '') + '/obf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ source: content, preset: vm_preset || 'Medium' })
        });
        if (!r.ok) throw new Error('obf server error');
        const j = await r.json();
        finalContent = j.output;
      } catch (e) {
        return res.status(502).json({ error: 'vm obf failed: ' + (e.message || 'unknown') });
      }
    }

    const slug = slugify(name);
    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_id: user.id,
        name,
        description: description || null,
        slug,
        content_enc: finalContent,
        is_public: is_public !== false,
        requires_key: wantsKey,
        obf_method: method
      })
      .select('id, slug, obf_method')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.status(200).json({
      slug: data.slug,
      loader_url: `/api/loader/${data.slug}`,
      obf_method: data.obf_method
    });
  }

  return res.status(405).json({ error: 'method not allowed' });
};