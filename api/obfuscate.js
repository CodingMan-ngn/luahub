// language: JavaScript, file: api/obfuscate.js
const { obfuscateLua } = require('../lib/obfuscator');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    try {
      const output = obfuscateLua(code);
      return res.status(200).json({ output });
    } catch (err) {
      return res.status(500).json({ error: 'Obfuscation failed' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};