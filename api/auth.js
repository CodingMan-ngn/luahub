const { supabase } = require('./_supabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { action, username, email, password } = req.body;

  if (action === 'register') {
    if (!username || !email || !password) return res.status(400).json({ error: 'missing fields' });
    const hash = await bcrypt.hash(password, 12);
    const { data, error } = await supabase
      .from('users')
      .insert({ username, email, password_hash: hash })
      .select('id, username, api_key, role, verified')
      .single();
    if (error) return res.status(400).json({ error: error.message });
    const token = jwt.sign({ id: data.id, username: data.username }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      token, api_key: data.api_key, username: data.username,
      role: data.role, verified: data.verified
    });
  }

  if (action === 'login') {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ error: 'invalid credentials' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'invalid credentials' });
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({
      token, api_key: user.api_key, username: user.username,
      role: user.role, verified: user.verified
    });
  }

  return res.status(400).json({ error: 'unknown action' });
};