// language: JavaScript, file: api/router.js
const { supabase } = require('./_supabase');

// Set ADMIN_KEY="mysecretpassword" in Vercel Env Vars
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123'; 

function isAdmin(req) {
  const key = req.query.admin_key || (req.headers.authorization || '').replace('Bearer ', '');
  return key === ADMIN_KEY;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Parse route from URL or query
  const route = req.query.route || req.url.split('?')[0].split('/').pop();

  try {
    // ==========================================
    // 1. /api/scripts (GET, DELETE)
    // ==========================================
    if (route === 'scripts') {
      res.setHeader('Content-Type', 'application/json');
      const { mine } = req.query;

      if (req.method === 'GET') {
        let query = supabase.from('scripts').select('id, name, description, slug, hits, requires_key, created_at').eq('is_deleted', false).order('created_at', { ascending: false });
        if (mine) {
          if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
        }
        const { data, error } = await query.limit(50);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data || []);
      }

      if (req.method === 'DELETE') {
        if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
        const { slug } = req.query;
        if (!slug) return res.status(400).json({ error: 'Slug required' });
        const { error } = await supabase.from('scripts').update({ is_deleted: true }).eq('slug', slug);
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }
    }

    // ==========================================
    // 2. /api/paste (POST)
    // ==========================================
    if (route === 'paste' && req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });
      
      const { name, description, content, place_id, requires_key, obfuscate } = req.body;
      if (!name || !content) return res.status(400).json({ error: 'Name and content required' });

      let finalContent = obfuscate ? obfuscateLua(content) : content;
      const newSlug = Math.random().toString(36).substring(2, 10);
      
      const { data, error } = await supabase.from('scripts').insert({
        name, description, slug: newSlug, content_enc: finalContent, 
        is_public: true, requires_key: !!requires_key, place_id: place_id || 'universal', obf_method: 'integrated'
      }).select('slug').single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ slug: data.slug });
    }

    // ==========================================
    // 3. /api/keys (GET, POST)
    // ==========================================
    if (route === 'keys') {
      res.setHeader('Content-Type', 'application/json');
      if (!isAdmin(req)) return res.status(401).json({ error: 'Unauthorized' });

      if (req.method === 'GET') {
        const { data, error } = await supabase.from('keys').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
        return res.status(200).json(data || []);
      }

      if (req.method === 'POST') {
        const { slug, duration, destination_url } = req.body;
        const key_string = 'LH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const expires_at = parseInt(duration) === 999 ? null : new Date(Date.now() + parseInt(duration) * 86400000).toISOString();
        
        const { data, error } = await supabase.from('keys').insert({
          key_string, script_slug: slug, destination_url,
          expires_at, remaining_time: duration, max_time: duration, is_used: false, is_deleted: false
        }).select('key_string').single();
        
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ key: data.key_string });
      }
    }

    // ==========================================
    // 4. /api/loader (GET)
    // ==========================================
    if (route === 'loader') {
      res.setHeader('Content-Type', 'text/plain');
      const { key, placeId, hwid } = req.query;
      
      const { data: script } = await supabase.from('scripts').select('*').or(`place_id.eq.${placeId},place_id.eq.universal,place_id.is.null`).eq('is_deleted', false).maybeSingle();
      
      if (!script) return res.status(404).send('warn("Game not supported")');
      if (script.requires_key && !key) {
         // THE LUARMOR-STYLE UI GOES HERE
         return res.status(403).send(`
local CoreGui = game:GetService("CoreGui")
local TweenService = game:GetService("TweenService")
-- (Insert the massive UI code from previous prompts here)
warn("Key required. Please execute the loadstring with a key.")
         `);
      }
      
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

    // ==========================================
    // 5. /api/gateway (POST)
    // ==========================================
    if (route === 'gateway' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const { action, slug, token } = req.body;
      
      if (action === 'start') {
        const gateway_token = Math.random().toString(36).substring(2, 15);
        const key_string = 'LH-' + Math.random().toString(36).substring(2, 15).toUpperCase();
        await supabase.from('keys').insert({ key_string, script_slug: slug, gateway_token, is_used: false, expires_at: new Date(Date.now() + 48*3600000).toISOString() });
        return res.status(200).json({ token: gateway_token });
      }
      
      if (action === 'claim') {
        const { data: keyData } = await supabase.from('keys').select('key_string').eq('gateway_token', token).single();
        if (!keyData) return res.status(404).json({ error: 'Invalid token' });
        await supabase.from('keys').update({ is_used: true }).eq('gateway_token', token);
        return res.status(200).json({ key: keyData.key_string });
      }
    }

    return res.status(404).json({ error: 'Route not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};