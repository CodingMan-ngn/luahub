// language: JavaScript, file: api/loader/[slug].js
const { supabase } = require('../_supabase');

module.exports = async (req, res) => {
  const { slug } = req.query;

  // Fetch script
  const { data: script, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle(); // Use maybeSingle to avoid throwing

  // If error or no script, return 404 with a specific message
  if (error) return res.status(500).send('-- DB Error: ' + error.message);
  if (!script) return res.status(404).send('-- Script not found');
  if (!script.is_public) return res.status(403).send('-- Script is private');

  // Bump hits
  supabase.from('scripts').update({ hits: (script.hits || 0) + 1 }).eq('id', script.id).then(() => {});

  // Generate the final payload
  let finalLua = script.content_enc;

  // Inject Liquid Glass Toast if show_intro is true
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
Frame.Position = UDim2.new(0.5, -150, 0.8, 0) -- Floats near bottom
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
    game.StarterGui:SetCore("SendNotification", {
        Title = "Copied!",
        Text = "Discord link copied to clipboard.",
        Duration = 5
    })
end)

-- Tween in
Frame.Position = UDim2.new(0.5, -150, 1.2, 0)
game:GetService("TweenService"):Create(Frame, TweenInfo.new(1, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {Position = UDim2.new(0.5, -150, 0.75, 0)}):Play()

task.delay(10, function()
    game:GetService("TweenService"):Create(Frame, TweenInfo.new(0.5, Enum.EasingStyle.Quart, Enum.EasingDirection.In), {Position = UDim2.new(0.5, -150, 1.2, 0)}):Play()
    task.wait(0.5)
    Frame:Destroy()
end)
`;
    // Prepend the intro to the script
    finalLua = introCode + '\n' + finalLua;
  }

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).send(finalLua);
};