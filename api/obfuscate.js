// language: JavaScript, file: api/obfuscate.js
const { obfuscateLua } = require('../lib/obfuscator');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Code required' });

      // Run the obfuscator
      const output = obfuscateLua(code);

      // Add a small delay to simulate heavy processing
      await new Promise(resolve => setTimeout(resolve, 800));

      return res.status(200).json({ output });
    } catch (err) {
      console.error("Obfuscation Error:", err);
      return res.status(500).json({ error: 'Obfuscation engine failed' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};