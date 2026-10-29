// language: JavaScript, file: api/loader.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  const key = req.query.key;
  const placeId = req.query.placeId || req.query.place; 
  const hwid = req.query.hwid || "UNKNOWN_HWID";

  // 1. Fetch the script for this specific game
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('place_id', placeId)
    .maybeSingle();

  if (error) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('-- Database Error');
  }

  if (!script) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(404).send(`
local ScreenGui = Instance.new("ScreenGui")
local Frame = Instance.new("Frame")
local Title = Instance.new("TextLabel")

ScreenGui.Parent = game.CoreGui
Frame.Parent = ScreenGui
Frame.Size = UDim2.new(0, 300, 0, 100)
Frame.Position = UDim2.new(0.5, -150, 0.5, -50)
Frame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)

Title.Parent = Frame
Title.Size = UDim2.new(1, 0, 1, 0)
Title.BackgroundTransparency = 1
Title.Text = "❌ Game Not Supported\\nJoin Discord to Request"
Title.TextColor3 = Color3.fromRGB(255, 80, 80)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 16
    `);
  }

  // 2. Handle Key System (HWID Locked)
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
    local hwid = game:GetService("RbxAnalyticsService"):GetClientId() or game.JobId
    local url = "https://lua-axon.vercel.app/api/loader?key=" .. Input.Text .. "&placeId=${placeId}&hwid=" .. hwid
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

    // Fetch from your actual 'keys' table
    const { data: dbKey, error: keyError } = await supabase
      .from('keys')
      .select('*')
      .eq('script_slug', script.slug)
      .eq('key_string', key)
      .maybeSingle();
    
    if (keyError || !dbKey) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Invalid Key');
    }

    // HWID Locking Logic using the new 'hwid' column
    if (!dbKey.hwid) {
      // First time use, lock it to this HWID
      await supabase.from('keys').update({ hwid: hwid }).eq('id', dbKey.id);
    } else if (dbKey.hwid !== hwid) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- HWID Mismatch. Key locked to another PC.');
    }
  }

  // 3. Send the obfuscated script
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send(script.content_enc);
};