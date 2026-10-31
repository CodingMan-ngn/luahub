// language: JavaScript, file: api/router.js
const { supabase } = require('./_supabase');
const { URL } = require('url');

const ADMIN_KEY = process.env.ADMIN_KEY || 'admin123';

function parseQuery(req) {
  const host = req.headers.host || 'localhost';
  return new URL(req.url, `https://${host}`).searchParams;
}

function isAdmin(req) {
  const q = parseQuery(req);
  const key = q.get('admin_key') || (req.headers.authorization || '').replace('Bearer ', '');
  return key === ADMIN_KEY;
}
function getPublicId(req) {
  const q = parseQuery(req);
  return q.get('public_id') || (req.headers.authorization || '').replace('Bearer ', '');
}

// Obfuscator (unchanged)
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

  const q = parseQuery(req);
  // Vercel rewrite sets ?route=<name>; also accept /api/<name> direct hit
  let route = q.get('route');
  if (!route) {
    const seg = req.url.split('?')[0].split('/').filter(Boolean).pop() || '';
    route = seg.replace(/\.js$/, '');
  }

  const admin = isAdmin(req);
  const public_id = getPublicId(req);

  try {
    // 1. SCRIPTS
    if (route === 'scripts' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      const mine = q.get('mine');
      const all = q.get('all');
      let query = supabase.from('scripts').select('*').eq('is_deleted', false).order('created_at', { ascending: false });

      if (mine) {
        if (admin) { /* Admin sees all */ }
        else if (public_id) query = query.eq('public_id', public_id);
        else return res.status(401).json({ error: 'No ID' });
      } else if (!all) {
        query = query.eq('is_public', true);
      }
      const { data, error } = await query.limit(100);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data || []);
    }

    // 2. PASTE
    if (route === 'paste') {
      res.setHeader('Content-Type', 'application/json');
      if (!admin && !public_id) return res.status(401).json({ error: 'Unauthorized' });

      if (req.method === 'POST') {
        const { name, description, content, place_id, requires_key, obfuscate } = req.body;
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
        const slug = q.get('slug');
        let query = supabase.from('scripts').update({ is_deleted: true }).eq('slug', slug);
        if (!admin) query = query.eq('public_id', public_id);
        const { error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
      }
    }

    // 3. OBFUSCATE
    if (route === 'obfuscate' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      if (!req.body.code) return res.status(400).json({ error: 'Code required' });
      return res.status(200).json({ output: obfuscateLua(req.body.code) });
    }

    // 4. KEYS
    if (route === 'keys') {
      res.setHeader('Content-Type', 'application/json');
      if (!admin) return res.status(401).json({ error: 'Unauthorized' });
      if (req.method === 'GET') {
        const { data } = await supabase.from('keys').select('*').eq('is_deleted', false).order('created_at', { ascending: false });
        return res.status(200).json(data || []);
      }
      if (req.method === 'POST') {
        const { slug, duration } = req.body;
        const key_string = 'LH-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const expires_at = parseInt(duration) === 999 ? null : new Date(Date.now() + parseInt(duration) * 86400000).toISOString();
        const { data, error } = await supabase.from('keys').insert({ key_string, script_slug: slug, expires_at, remaining_time: duration, max_time: duration, is_used: false, is_deleted: false }).select('key_string').single();
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ key: data.key_string });
      }
    }

    // 5. GATEWAY
    if (route === 'gateway' && req.method === 'POST') {
      res.setHeader('Content-Type', 'application/json');
      const { action, slug, token } = req.body;

      if (action === 'start') {
        const gateway_token = Math.random().toString(36).substring(2, 15);
        const key_string = 'LH-' + Math.random().toString(36).substring(2, 15).toUpperCase();
        const { error } = await supabase.from('keys').insert({
          key_string, script_slug: slug || 'universal', gateway_token,
          is_used: false, is_deleted: false,
          expires_at: new Date(Date.now() + 48*3600000).toISOString()
        });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ token: gateway_token });
      }

      if (action === 'claim') {
        const { data: keyData, error } = await supabase.from('keys').select('key_string').eq('gateway_token', token).maybeSingle();
        if (error || !keyData) return res.status(404).json({ error: 'Invalid token' });
        await supabase.from('keys').update({ is_used: true }).eq('gateway_token', token);
        return res.status(200).json({ key: keyData.key_string });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    // 6. LOADER
    if (route === 'loader') {
      res.setHeader('Content-Type', 'text/plain');
      const key = q.get('key');
      const placeId = q.get('placeId');
      const hwid = q.get('hwid');
      const { data: script } = await supabase.from('scripts').select('*').or(`place_id.eq.${placeId},place_id.eq.universal,place_id.is.null`).eq('is_deleted', false).maybeSingle();

      if (!script) return res.status(404).send('warn("Game not supported")');

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

    return res.status(404).json({ error: 'Route not found: ' + route });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};