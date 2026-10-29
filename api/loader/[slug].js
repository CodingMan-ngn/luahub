// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const parts = req.url.split('?')[0].split('/');
  let slug = parts[parts.length - 1];
  if (!slug || slug === '[slug]') slug = req.query.slug;
  
  const key = req.query.key;
  const hwid = req.query.hwid || "UNKNOWN_HWID";

  const { data: script, error } = await supabase.from('scripts').select('*').eq('slug', slug).maybeSingle();
  if (error || !script) return res.status(404).send('-- Script not found');

  if (script.requires_key) {
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(`
local ScreenGui = Instance.new("ScreenGui")
local Frame = Instance.new("Frame")
local UICorner = Instance.new("UICorner")
local Title = Instance.new("TextLabel")
local Input = Instance.new("TextBox")
local Submit = Instance.new("TextButton")

ScreenGui.Parent = game.CoreGui
Frame.Parent = ScreenGui
Frame.Size = UDim2.new(0, 320, 0, 160)
Frame.Position = UDim2.new(0.5, -160, 0.5, -80)
Frame.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
Frame.BorderSizePixel = 0
UICorner.CornerRadius = UDim.new(0, 12)
UICorner.Parent = Frame

Title.Parent = Frame
Title.Size = UDim2.new(1, 0, 0, 30)
Title.Position = UDim2.new(0, 0, 0, 15)
Title.Text = "🔑 Hardware Locked Key"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 18
Title.BackgroundTransparency = 1

Input.Parent = Frame
Input.Size = UDim2.new(1, -40, 0, 40)
Input.Position = UDim2.new(0, 20, 0, 60)
Input.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
Input.TextColor3 = Color3.fromRGB(255, 255, 255)
Input.PlaceholderText = "Paste key here..."
Input.Font = Enum.Font.Gotham

Submit.Parent = Frame
Submit.Size = UDim2.new(1, -40, 0, 35)
Submit.Position = UDim2.new(0, 20, 0, 115)
Submit.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
Submit.Text = "Verify & Lock"
Submit.TextColor3 = Color3.fromRGB(255, 255, 255)
Submit.Font = Enum.Font.GothamBold

Submit.MouseButton1Click:Connect(function()
    -- Generate a pseudo-HWID based on executor environment
    local hwid = game:GetService("RbxAnalyticsService"):GetClientId() or game.JobId
    local url = "https://lua-axon.vercel.app/api/loader/${slug}?key=" .. Input.Text .. "&hwid=" .. hwid
    local success, payload = pcall(function() return game:HttpGet(url) end)
    if success and string.sub(payload, 1, 2) ~= "--" then
        Frame:Destroy()
        loadstring(payload)()
    else
        Submit.Text = "❌ " .. (string.sub(payload, 4) or "Invalid Key")
        Submit.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
        task.wait(2)
        Submit.Text = "Verify & Lock"
        Submit.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
    end
end)
      `);
    }

    const { data: dbKey } = await supabase.from('script_keys').select('*').eq('script_id', script.id).eq('key_value', key).maybeSingle();
    if (!dbKey) return res.status(403).send('-- Invalid Key');

    // HWID Locking Logic
    if (!dbKey.hwid) {
      // First time use: lock the key to this HWID
      await supabase.from('script_keys').update({ hwid: hwid, is_used: true }).eq('id', dbKey.id);
    } else {
      // Subsequent uses: verify HWID matches
      if (dbKey.hwid !== hwid) {
        return res.status(403).send('-- HWID Mismatch. Key locked to another PC.');
      }
    }
  }

  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(script.content_enc);
};