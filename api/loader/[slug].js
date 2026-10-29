// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  const { data: script, error } = await supabase
    .from('scripts').select('*').eq('slug', slug).maybeSingle(); 

  if (error) return res.status(500).send('-- DB Error: ' + error.message);
  if (!script) return res.status(404).send('-- Script not found');

  // --- PRIVATE SCRIPT ANIMATION ---
  if (script.is_private) {
    const discordLink = "https://discord.gg/P4P5jZGt3m";
    const privateLua = `
local ScreenGui = Instance.new("ScreenGui")
local Frame = Instance.new("Frame")
local UICorner = Instance.new("UICorner")
local Title = Instance.new("TextLabel")
local Sub = Instance.new("TextLabel")
local Btn = Instance.new("TextButton")
local UIStroke = Instance.new("UIStroke")

ScreenGui.Parent = game.CoreGui
ScreenGui.Name = "PrivateNotice"

Frame.Parent = ScreenGui
Frame.Size = UDim2.new(0, 400, 0, 250)
Frame.Position = UDim2.new(0.5, -200, 0.5, -125)
Frame.BackgroundColor3 = Color3.fromRGB(10, 10, 15)
Frame.BackgroundTransparency = 0.1
Frame.BorderSizePixel = 0

UIStroke.Parent = Frame
UIStroke.Color = Color3.fromRGB(239, 68, 68)
UIStroke.Thickness = 2

UICorner.CornerRadius = UDim.new(0, 16)
UICorner.Parent = Frame

Title.Parent = Frame
Title.Size = UDim2.new(1, 0, 0, 50)
Title.Position = UDim2.new(0, 0, 0, 30)
Title.Text = "Owner Set To Private"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBlack
Title.TextSize = 24
Title.BackgroundTransparency = 1

Sub.Parent = Frame
Sub.Size = UDim2.new(1, -40, 0, 60)
Sub.Position = UDim2.new(0, 20, 0, 80)
Sub.Text = "This script is no longer available. Click below to get a new script."
Sub.TextColor3 = Color3.fromRGB(180, 180, 180)
Sub.Font = Enum.Font.GothamMedium
Sub.TextSize = 14
Sub.TextWrapped = true
Sub.BackgroundTransparency = 1

Btn.Parent = Frame
Btn.Size = UDim2.new(1, -40, 0, 45)
Btn.Position = UDim2.new(0, 20, 0, 160)
Btn.BackgroundColor3 = Color3.fromRGB(239, 68, 68)
Btn.Text = "Get New Script"
Btn.TextColor3 = Color3.fromRGB(255, 255, 255)
Btn.Font = Enum.Font.GothamBold
Btn.TextSize = 16
Btn.BorderSizePixel = 0
local btnCorner = Instance.new("UICorner", Btn)
btnCorner.CornerRadius = UDim.new(0, 8)

-- Animate In
Frame.Position = UDim2.new(0.5, -200, 0.6, -125)
game:GetService("TweenService"):Create(Frame, TweenInfo.new(0.6, Enum.EasingStyle.Back, Enum.EasingDirection.Out), {Position = UDim2.new(0.5, -200, 0.5, -125)}):Play()

Btn.MouseButton1Click:Connect(function()
    setclipboard("${discordLink}")
    game.StarterGui:SetCore("SendNotification", {Title="Copied!", Text="Discord link copied to clipboard.", Duration=5})
    task.wait(2)
    game.Players.LocalPlayer:Kick("Script gone private. Join Discord to receive updates: ${discordLink}")
end)

task.delay(6, function()
    game.Players.LocalPlayer:Kick("Script gone private. Join Discord to receive updates: ${discordLink}")
end)
`;
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(privateLua);
  }

  // --- NORMAL SCRIPT ---
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});

  let finalLua = script.content_enc;

  if (script.show_intro) {
    const discordLink = "https://discord.gg/P4P5jZGt3m";
    const introCode = `
local ScreenGui = Instance.new("ScreenGui")
local Frame = Instance.new("Frame")
local Title = Instance.new("TextLabel")
local Desc = Instance.new("TextLabel")
local Button = Instance.new("TextButton")
local UICorner = Instance.new("UICorner")
local UIBlur = Instance.new("BlurEffect")

ScreenGui.Parent = game.CoreGui
ScreenGui.Name = "LuaHubIntro"

Frame.Parent = ScreenGui
Frame.Size = UDim2.new(0, 300, 0, 120)
Frame.Position = UDim2.new(0.5, -150, 0.8, 0)
Frame.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
Frame.BackgroundTransparency = 0.3
Frame.BorderSizePixel = 0

local stroke = Instance.new("UIStroke", Frame)
stroke.Color = Color3.fromRGB(124, 58, 237)
stroke.Thickness = 2

UICorner.CornerRadius = UDim.new(0, 12)
UICorner.Parent = Frame

Title.Parent = Frame
Title.Size = UDim2.new(1, 0, 0, 30)
Title.Position = UDim2.new(0, 0, 0, 15)
Title.BackgroundTransparency = 1
Title.Text = "LuaHub Script Loaded"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.Font = Enum.Font.GothamBold
Title.TextSize = 16

Desc.Parent = Frame
Desc.Size = UDim2.new(1, -20, 0, 40)
Desc.Position = UDim2.new(0, 10, 0, 45)
Desc.BackgroundTransparency = 1
Desc.Text = "Join our Discord for updates and support!"
Desc.TextColor3 = Color3.fromRGB(180, 180, 180)
Desc.Font = Enum.Font.Gotham
Desc.TextSize = 12
Desc.TextWrapped = true

Button.Parent = Frame
Button.Size = UDim2.new(1, -40, 0, 35)
Button.Position = UDim2.new(0, 20, 0, 90)
Button.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
Button.Text = "Join Discord"
Button.TextColor3 = Color3.fromRGB(255, 255, 255)
Button.Font = Enum.Font.GothamBold
Button.TextSize = 14
Button.BorderSizePixel = 0
local btnCorner = Instance.new("UICorner", Button)
btnCorner.CornerRadius = UDim.new(0, 8)

Button.MouseButton1Click:Connect(function()
    setclipboard("${discordLink}")
    game.StarterGui:SetCore("SendNotification", {Title="Copied!", Text="Discord link copied to clipboard.", Duration=5})
end)

Frame.Position = UDim2.new(0.5, -150, 1.2, 0)
game:GetService("TweenService"):Create(Frame, TweenInfo.new(1, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {Position = UDim2.new(0.5, -150, 0.75, 0)}):Play()

task.delay(10, function()
    game:GetService("TweenService"):Create(Frame, TweenInfo.new(0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.In), {Position = UDim2.new(0.5, -150, 1.2, 0)}):Play()
    task.wait(0.5)
    Frame:Destroy()
end)
`;
    finalLua = introCode + '\n' + finalLua;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(finalLua);
};