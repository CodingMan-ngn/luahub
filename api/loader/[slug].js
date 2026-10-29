// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;
  const key = req.query.key; // e.g. ?key=A1B2C3D4

  // 1. Fetch script
  const { data: script, error } = await supabase.from('scripts').select('*').eq('slug', slug).maybeSingle();

  if (error) return res.status(500).send('-- DB Error');
  if (!script) return res.status(404).send('-- Script not found');

  // 2. Handle Key System
  if (script.requires_key) {
    if (!key) {
      return res.status(403).send(`
        local ScreenGui = Instance.new("ScreenGui")
        local Frame = Instance.new("Frame")
        Frame.Parent = ScreenGui
        Frame.Size = UDim2.new(0, 300, 0, 100)
        Frame.Position = UDim2.new(0.5, -150, 0.5, -50)
        Frame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
        local T = Instance.new("TextLabel", Frame)
        T.Size = UDim2.new(1, 0, 1, 0)
        T.BackgroundTransparency = 1
        T.Text = "KEY REQUIRED\\nAdd ?key=YOUR_KEY to the loadstring"
        T.TextColor3 = Color3.fromRGB(255, 80, 80)
        T.Font = Enum.Font.GothamBold
        T.TextSize = 16
        ScreenGui.Parent = game.CoreGui
      `);
    }

    // Check if key exists and is NOT used
    const { data: dbKey } = await supabase
      .from('script_keys')
      .select('id, is_used')
      .eq('script_id', script.id)
      .eq('key_value', key)
      .maybeSingle();

    if (!dbKey) return res.status(403).send('-- Invalid Key');
    if (dbKey.is_used) return res.status(403).send('-- Key already used');

    // Mark key as used
    await supabase.from('script_keys').update({ is_used: true }).eq('id', dbKey.id);
  }

  // 3. Bump hits
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});

  // 4. Send content
  let finalLua = script.content_enc;
  
  // (If you have the intro injection logic, place it here)

  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(finalLua);
};