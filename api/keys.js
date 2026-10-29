// language: JavaScript, file: api/keys.js
const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = authUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // --- GET: Fetch user's keys ---
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('keys')
      .select('*')
      .eq('created_by', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  // --- POST: Generate a new key ---
  if (req.method === 'POST') {
    const { slug, duration, destination_url } = req.body;
    if (!slug) return res.status(400).json({ error: 'Script slug required' });

    // 1. Verify script ownership
    const { data: script, error: scriptErr } = await supabase
      .from('scripts')
      .select('owner_id')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .single();

    if (scriptErr || !script) return res.status(404).json({ error: 'Script not found.' });
    if (script.owner_id !== user.id) return res.status(403).json({ error: 'You do not own this script.' });

    // 2. Generate the key string
    // Format: LH-XXXXXXXXXXXXXXXX
    const key_string = 'LH-' + Math.random().toString(36).substring(2, 10).toUpperCase() + Math.random().toString(36).substring(2, 10).toUpperCase();

    // 3. Calculate expiry
    // duration is passed as days (1, 7, 30), or 999 for Lifetime
    const durationDays = parseInt(duration) || 1;
    const expires_at = durationDays === 999 
      ? null 
      : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    // 4. Insert into Supabase
    const { data, error } = await supabase
      .from('keys')
      .insert({
        key_string,
        script_slug: slug,
        created_by: user.id,
        destination_url: destination_url || null,
        expires_at: expires_at,
        remaining_time: durationDays,
        max_time: durationDays,
        is_used: false,
        is_deleted: false
      })
      .select('key_string')
      .single();

    if (error) {
      console.error("Key Gen Error:", error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.status(200).json({ key: data.key_string });
  }

  // --- DELETE: Soft-delete a key ---
  if (req.method === 'DELETE') {
    const { key_string } = req.query;
    if (!key_string) return res.status(400).json({ error: 'Key string required' });

    const { error } = await supabase
      .from('keys')
      .update({ is_deleted: true })
      .eq('key_string', key_string)
      .eq('created_by', user.id); // Ensure they can only delete their own keys

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};