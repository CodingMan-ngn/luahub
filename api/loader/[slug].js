// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  // 1. Extract slug from URL path (fixes the 'undefined' error)
  const parts = req.url.split('?')[0].split('/');
  let slug = parts[parts.length - 1];

  // Catch fallback
  if (!slug || slug === '[slug]') {
    slug = req.query.slug;
  }

  const key = req.query.key;

  console.log("FETCHING SLUG:", slug);

  // 2. Fetch the script from Supabase
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle(); 

  if (error) {
    console.error("DB ERROR:", error);
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('-- Database error: ' + error.message);
  }
  
  if (!script) {
    console.log("SCRIPT NOT FOUND IN DB");
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send('-- Script not found');
  }

  // 3. Handle Key System
  if (script.requires_key) {
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
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

  // 4. Bump hits
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});

  // 5. Send content
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(script.content_enc);
};