// language: JavaScript, file: api/loader.js
const { supabase } = require('./_supabase');

module.exports = async (req, res) => {
  const key = req.query.key;
  const placeId = req.query.placeId || req.query.place; 
  const hwid = req.query.hwid || "UNKNOWN_HWID";

  // 1. Fetch the script (match specific Place ID OR universal fallback)
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .or(`place_id.eq.${placeId},place_id.eq.universal,place_id.is.null`)
    .maybeSingle();

  if (error) {
    res.setHeader('Content-Type', 'text/plain');
    return res.status(500).send('-- Database Error: ' + error.message);
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

  // 2. Handle Key System (The Luarmor UI)
  if (script.requires_key) {
    if (!key) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send(`
local CoreGui = game:GetService("CoreGui")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

-- Destroy old UI if exists
local oldUI = CoreGui:FindFirstChild("LuaHubKeyUI")
if oldUI then oldUI:Destroy() end

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "LuaHubKeyUI"
ScreenGui.Parent = CoreGui
ScreenGui.ResetOnSpawn = false

local MainFrame = Instance.new("Frame")
MainFrame.Size = UDim2.new(0, 380, 0, 260)
MainFrame.Position = UDim2.new(0.5, -190, 0.5, -130)
MainFrame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
MainFrame.BorderSizePixel = 0
MainFrame.Active = true
MainFrame.Draggable = true
MainFrame.Parent = ScreenGui

local UICorner = Instance.new("UICorner")
UICorner.CornerRadius = UDim.new(0, 12)
UICorner.Parent = MainFrame

local UIStroke = Instance.new("UIStroke")
UIStroke.Color = Color3.fromRGB(124, 58, 237)
UIStroke.Thickness = 1.5
UIStroke.Transparency = 0.5
UIStroke.Parent = MainFrame

-- Entrance Animation
MainFrame.Size = UDim2.new(0, 0, 0, 0)
TweenService:Create(MainFrame, TweenInfo.new(0.4, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {Size = UDim2.new(0, 380, 0, 260)}):Play()

local Title = Instance.new("TextLabel")
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Position = UDim2.new(0, 0, 0, 15)
Title.BackgroundTransparency = 1
Title.Text = "🔑 LuaHub Authentication"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 18
Title.Parent = MainFrame

local Input = Instance.new("TextBox")
Input.Size = UDim2.new(1, -40, 0, 45)
Input.Position = UDim2.new(0, 20, 0, 70)
Input.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
Input.TextColor3 = Color3.fromRGB(255, 255, 255)
Input.PlaceholderText = "Paste your key here..."
Input.Font = Enum.Font.Gotham
Input.TextSize = 14
Input.Parent = MainFrame
local InputCorner = Instance.new("UICorner")
InputCorner.CornerRadius = UDim.new(0, 6)
InputCorner.Parent = Input

local VerifyBtn = Instance.new("TextButton")
VerifyBtn.Size = UDim2.new(1, -40, 0, 40)
VerifyBtn.Position = UDim2.new(0, 20, 0, 130)
VerifyBtn.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
VerifyBtn.Text = "Verify & Execute"
VerifyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
VerifyBtn.Font = Enum.Font.GothamBold
VerifyBtn.Parent = MainFrame
local BtnCorner = Instance.new("UICorner")
BtnCorner.CornerRadius = UDim.new(0, 6)
BtnCorner.Parent = VerifyBtn

-- Button Hover Animation
VerifyBtn.MouseEnter:Connect(function()
    TweenService:Create(VerifyBtn, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(139, 92, 246)}):Play()
end)
VerifyBtn.MouseLeave:Connect(function()
    TweenService:Create(VerifyBtn, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(124, 58, 237)}):Play()
end)

-- Bottom Buttons (Get Key / Discord)
local BottomFrame = Instance.new("Frame")
BottomFrame.Size = UDim2.new(1, -40, 0, 30)
BottomFrame.Position = UDim2.new(0, 20, 0, 190)
BottomFrame.BackgroundTransparency = 1
BottomFrame.Parent = MainFrame

local GetKeyBtn = Instance.new("TextButton")
GetKeyBtn.Size = UDim2.new(0.48, 0, 1, 0)
GetKeyBtn.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
GetKeyBtn.Text = "Get Key (Gateway)"
GetKeyBtn.TextColor3 = Color3.fromRGB(200, 200, 200)
GetKeyBtn.Font = Enum.Font.Gotham
GetKeyBtn.TextSize = 12
GetKeyBtn.Parent = BottomFrame
local GKCorner = Instance.new("UICorner")
GKCorner.CornerRadius = UDim.new(0, 4)
GKCorner.Parent = GetKeyBtn

local DiscordBtn = Instance.new("TextButton")
DiscordBtn.Size = UDim2.new(0.48, 0, 1, 0)
DiscordBtn.Position = UDim2.new(0.52, 0, 0, 0)
DiscordBtn.BackgroundColor3 = Color3.fromRGB(88, 101, 242)
DiscordBtn.Text = "Join Discord"
DiscordBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
DiscordBtn.Font = Enum.Font.Gotham
DiscordBtn.TextSize = 12
DiscordBtn.Parent = BottomFrame
local DSCorner = Instance.new("UICorner")
DSCorner.CornerRadius = UDim.new(0, 4)
DSCorner.Parent = DiscordBtn

-- Button Actions
GetKeyBtn.MouseButton1Click:Connect(function()
    setclipboard("https://lua-axon.vercel.app/keys.html") -- Open your Gateway page
    GetKeyBtn.Text = "Link Copied!"
    task.wait(2)
    GetKeyBtn.Text = "Get Key (Gateway)"
end)

DiscordBtn.MouseButton1Click:Connect(function()
    setclipboard("https://discord.gg/P4P5jZGt3m")
    DiscordBtn.Text = "Link Copied!"
    task.wait(2)
    DiscordBtn.Text = "Join Discord"
end)

VerifyBtn.MouseButton1Click:Connect(function()
    local userKey = Input.Text
    if userKey == "" then return end
    
    VerifyBtn.Text = "Verifying..."
    local hwid = game:GetService("RbxAnalyticsService"):GetClientId() or game.JobId
    
    -- Re-fetch the script with the key included
    local url = "https://lua-axon.vercel.app/api/loader?key=" .. userKey .. "&placeId=${placeId}&hwid=" .. hwid
    local success, payload = pcall(function() return game:HttpGet(url) end)
    
    if success and string.sub(payload, 1, 2) ~= "--" and not string.find(payload, "Invalid Key") and not string.find(payload, "HWID Mismatch") then
        ScreenGui:Destroy()
        loadstring(payload)()
    else
        VerifyBtn.Text = "❌ Invalid Key / HWID"
        VerifyBtn.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
        task.wait(2)
        VerifyBtn.Text = "Verify & Execute"
        VerifyBtn.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
    end
end)
      `);
    }

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

    // Check Expiration
    if (dbKey.expires_at && new Date(dbKey.expires_at) < new Date()) {
      res.setHeader('Content-Type', 'text/plain');
      return res.status(403).send('-- Key Expired');
    }

    // HWID Locking Logic
    if (!dbKey.hwid) {
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