// language: JavaScript, file: api/router.js
const { supabase } = require('./_supabase');

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123'; 

// Auth Checkers
function isAdmin(req) {
  const key = req.query.admin_key || (req.headers.authorization || '').replace('Bearer ', '');
  return key === ADMIN_KEY;
}
function getPublicId(req) {
  return req.query.public_id || (req.headers.authorization || '').replace('Bearer ', '');
}

function randomHex(bytes) { return [...Array(bytes)].map(() => Math.floor(Math.random() * 255).toString(16).padStart(2,'0')).join(''); }
function xorEncodeHex(src, key) {
  const s = Buffer.from(src, 'utf8'); const k = Buffer.from(key, 'utf8');
  const o = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s[i] ^ k[i % k.length];
  return o.toString('hex');
}
function obfuscateLua(source) {
  const key = randomHex(16);
  const encodedHex = xorEncodeHex(source, key);
  const encodedKeyHex = Buffer.from(key, 'utf8').toString('hex');
  const hexToLuaStr = (hex) => { const chars = []; for (let i = 0; i < hex.length; i += 2) chars.push(`\\${parseInt(hex.substr(i, 2), 16)}`); return `"${chars.join('')}"`; };
  return `local _c = ${hexToLuaStr(encodedHex)}\nlocal _k = ${hexToLuaStr(encodedKeyHex)}\nlocal _r = {}\nfor i = 1, #_c do local b1 = string.byte(_c, i) local b2 = string.byte(_k, ((i-1) % #_k) + 1) _r[i] = string.char(bit32.bxor(b1, b2)) end\nloadstring(table.concat(_r))()`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const route = req.query.route || req.url.split('?')[0].split('/').pop();
  const admin = isAdmin(req);
  const public_id = getPublicId(req);

  try {
    // ==========================================
    // 1. /api/scripts (GET)
    // ==========================================
    if (route === 'scripts' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      const { mine, all } = req.query;

      let query = supabase.from('scripts').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
      
      if (mine) {
        if (admin) { /* Admin sees all their own */ } 
        else if (public_id) query = query.eq('public_id', public_id);
        else return res.status(401).json({ error: 'No ID' });
      } else if (!all) {
        query = query.eq('is_public', true); // Public feed
      }

      const { data, error } = await query.limit(100);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    // ==========================================
    // 2. /api/paste (POST, PUT, DELETE)
    // ==========================================
    if (route === 'paste') {
      res.setHeader('Content-Type', 'application/json');
      if (!admin && !public_id) return res.status(401).json({ error: 'Unauthorized' });

      if (req.method === 'POST') {
        const { name, description, content, place_id, requires_key, obfuscate } = req.body;
        if (!name || !content) return res.status(400).json({ error: 'Name and content required' });

        let finalContent = obfuscate ? obfuscateLua(content) : content;
        const newSlug = Math.random().toString(36).substring(2, 10);
        
        const { data, error } = await supabase.from('scripts').insert({
          name, description, slug: newSlug, content_enc: finalContent, 
          is_public: true, requires_key: !!requires_key, place_id: place_id || 'universal', 
          obf_method: 'integrated', public_id: public_id || null
        }).select('slug').single();

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ slug: data.slug });
      }

      if (req.method === 'DELETE') {
        const { slug } = req.query;
        let query = supabase.from('scripts').update({ is_deleted: true }).eq('slug', slug);
        if (!admin) query = query.eq('public_id', public_id); // Public users can only delete their own
        
        const { error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }
    }

    // ==========================================
    // 3. /api/obfuscate (POST)
    // ==========================================
    if (route === 'obfuscate' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code required' });
      return res.status(200).json({ output: obfuscateLua(code) });
    }

    // ==========================================
    // 4. /api/loader (GET)
    // ==========================================
    if (route === 'loader') {
      res.setHeader('Content-Type', 'text/plain');
      const { key, placeId, hwid } = req.query;
      
      const { data: script } = await supabase.from('scripts').select('*').or(`place_id.eq.${placeId},place_id.eq.universal,place_id.is.null`).eq('is_deleted', false).maybeSingle();
      
      if (!script) return res.status(404).send('warn("Game not supported")');
      
      // Key logic
      if (script.requires_key && key) {
        const { data: dbKey } = await supabase.from('keys').select('*').eq('script_slug', script.slug).eq('key_string', key).maybeSingle();
        if (!dbKey) return res.status(403).send('warn("Invalid Key")');
        if (dbKey.expires_at && new Date(dbKey.expires_at) < new Date()) return res.status(403).send('warn("Expired")');
        
        if (!dbKey.hwid) await supabase.from('keys').update({ hwid }).eq('id', dbKey.id);
        else if (dbKey.hwid !== hwid) return res.status(403).send('warn("HWID Mismatch")');
      }

      supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});
      return res.status(200).send(script.content_enc);
    }

    return res.status(404).json({ error: 'Route not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};