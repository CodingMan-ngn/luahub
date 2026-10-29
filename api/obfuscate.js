// language: JavaScript, file: api/obfuscate.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });

    // This is a placeholder for your actual obfuscator logic.
    // If you have a VM_OBF_URL (Prometheus), call it here.
    // For now, we simulate a successful obfuscation by Base64 encoding it.
    
    try {
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const obfuscated = Buffer.from(code).toString('base64');
      const luaWrapper = `loadstring(game:HttpGet("data:text/plain;base64,${obfuscated}"))()`;

      return res.status(200).json({ output: luaWrapper });
    } catch (err) {
      return res.status(500).json({ error: 'Obfuscation failed' });
    }
  }
  return res.status(405).json({ error: 'Method not allowed' });
};