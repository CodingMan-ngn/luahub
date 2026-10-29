const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7);
}

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// Luarmor-style UI Loader
function generateLoaderString(script) {
  const apiBase = process.env.SITE_URL || 'https://lua-axon.vercel.app';
  
  return `--[[ LuaHub Key System Loader | Script: ${script.name} ]]
  local CONFIG = {
      ScriptSlug = "${script.slug}",
      ApiUrl = "${apiBase}/api/keys",
      PayloadUrl = "${apiBase}/api/loader/${script.slug}",
      RequiresKey = ${script.requires_key ? 'true' : 'false'},
      RedirectUrl = "${script.boosty_url || ''}",
      Duration = ${script.key_duration || 600}
  }

  local function fetchPayload()
      local success, data = pcall(function() return game:HttpGet(CONFIG.PayloadUrl) end)
      if success and data and string.sub(data, 1, 2) ~= "--" then
          local func, err = loadstring(data)
          if func then pcall(func) else warn("[LuaHub] Execution Error") end
      else
          warn("[LuaHub] Failed to fetch script.")
      end
  end

  if not CONFIG.RequiresKey then fetchPayload() return end

  local CoreGui = game:GetService("CoreGui")
  local HttpService = game:GetService("HttpService")

  local function createUI()
      local ScreenGui = Instance.new("ScreenGui")
      ScreenGui.Name = "LuaHub_UI"
      ScreenGui.ResetOnSpawn = false
      ScreenGui.Parent = CoreGui

      local MainFrame = Instance.new("Frame")
      MainFrame.Size = UDim2.new(0, 450, 0, 300)
      MainFrame.Position = UDim2.new(0.5, -225, 0.5, -150)
      MainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
      MainFrame.BorderSizePixel = 0
      MainFrame.Parent = ScreenGui

      local UICorner = Instance.new("UICorner")
      UICorner.CornerRadius = UDim.new(0, 12)
      UICorner.Parent = MainFrame

      local Title = Instance.new("TextLabel")
      Title.Size = UDim2.new(1, 0, 0, 50)
      Title.BackgroundTransparency = 1
      Title.Text = "${script.name} Keysystem"
      Title.TextColor3 = Color3.fromRGB(255, 255, 255)
      Title.Font = Enum.Font.GothamBold
      Title.TextSize = 20
      Title.TextXAlignment = Enum.TextXAlignment.Left
      Title.Position = UDim2.new(0, 20, 0, 10)
      Title.Parent = MainFrame

      local StatusText = Instance.new("TextLabel")
      StatusText.Size = UDim2.new(1, -40, 0, 40)
      StatusText.Position = UDim2.new(0, 20, 0, 60)
      StatusText.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
      StatusText.TextColor3 = Color3.fromRGB(200, 200, 200)
      StatusText.Text = "Status: Checking..."
      StatusText.Font = Enum.Font.Gotham
      StatusText.TextSize = 14
      StatusText.Parent = MainFrame

      local KeyBox = Instance.new("TextBox")
      KeyBox.Size = UDim2.new(1, -140, 0, 40)
      KeyBox.Position = UDim2.new(0, 20, 0, 120)
      KeyBox.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
      KeyBox.TextColor3 = Color3.fromRGB(255, 255, 255)
      KeyBox.PlaceholderText = "Paste your key here..."
      KeyBox.Font = Enum.Font.Code
      KeyBox.TextSize = 14
      KeyBox.Parent = MainFrame

      local GetKeyBtn = Instance.new("TextButton")
      GetKeyBtn.Size = UDim2.new(0, 100, 0, 40)
      GetKeyBtn.Position = UDim2.new(1, -120, 0, 120)
      GetKeyBtn.BackgroundColor3 = Color3.fromRGB(50, 200, 100)
      GetKeyBtn.Text = "Get Key"
      GetKeyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
      GetKeyBtn.Font = Enum.Font.GothamBold
      GetKeyBtn.TextSize = 14
      GetKeyBtn.Parent = MainFrame
      GetKeyBtn.MouseButton1Click:Connect(function()
          pcall(function() game:GetService("GuiService"):OpenBrowserWindow(CONFIG.RedirectUrl) end)
      end)

      local VerifyBtn = Instance.new("TextButton")
      VerifyBtn.Size = UDim2.new(1, -40, 0, 40)
      VerifyBtn.Position = UDim2.new(0, 20, 0, 180)
      VerifyBtn.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
      VerifyBtn.Text = "Verify and Load Script"
      VerifyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
      VerifyBtn.Font = Enum.Font.GothamBold
      VerifyBtn.TextSize = 14
      VerifyBtn.Parent = MainFrame
      
      return ScreenGui, KeyBox, VerifyBtn, StatusText
  end

  local ScreenGui, KeyBox, VerifyBtn, StatusText = createUI()

  VerifyBtn.MouseButton1Click:Connect(function()
      local key = KeyBox.Text
      if #key < 5 then
          StatusText.Text = "Status: Invalid Key Format"
          return
      end

      StatusText.Text = "Status: Verifying..."
      VerifyBtn.Text = "Verifying..."

      local req = request or http_request or syn.request or fluxus.request
      if not req then
          StatusText.Text = "Status: Exploit doesn't support HTTP requests."
          return
      end

      local success, response = pcall(function()
          return req({
              Url = CONFIG.ApiUrl,
              Method = "POST",
              Headers = { ["Content-Type"] = "application/json" },
              Body = HttpService:JSONEncode({
                  action = "verify",
                  key_string = key,
                  slug = CONFIG.ScriptSlug
              })
          })
      end)

      if success and response and response.Body then
          local data = HttpService:JSONDecode(response.Body)
          if data.status == "success" then
              StatusText.Text = "Status: Valid! Loading script..."
              VerifyBtn.Text = "Success!"
              task.wait(1)
              ScreenGui:Destroy()
              fetchPayload()
          else
              StatusText.Text = "Status: " .. (data.error or "Invalid key")
              VerifyBtn.Text = "Verify and Load Script"
          end
      else
          StatusText.Text = "Status: Network Error"
          VerifyBtn.Text = "Verify and Load Script"
      end
  end)
  `.trim();
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, slug, hits, requires_key, is_public_source, source_code, owner_name, created_at, obf_method, boosty_url, key_duration, return_url, share_url')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user || !user.is_dev) return res.status(403).json({ error: 'Developer role required' });

    const { name, content, is_public_source, source_code, requires_key, obf_method, boosty_url, key_duration } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    const method = ['loader', 'bootstrapper'].includes(obf_method) ? obf_method : 'loader';
    const encrypted_content = `loadstring((function() local h='${Buffer.from(content).toString('hex')}'; local s=''; for i=1,#h,2 do s=s..string.char(tonumber(h:sub(i,i+1),16)) end; return s end)())()`;

    const slug = slugify(name);
    const baseUrl = process.env.SITE_URL || 'https://lua-axon.vercel.app';
    
    // The key to the chicken-and-egg problem: Generate a generic callback token
    const callbackToken = crypto.randomBytes(8).toString('hex');
    const share_url = `${baseUrl}/key-system?slug=${slug}`;
    // This URL is safe to give to BoostyLink *before* you have the actual link
    const return_url = `${baseUrl}/api/auth/boosty-callback?slug=${slug}&token=${callbackToken}`;

    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_name: user.name,
        name,
        slug: slug,
        content_enc: encrypted_content,
        source_code: is_public_source ? source_code : null,
        is_public_source: !!is_public_source,
        requires_key: !!requires_key,
        obf_method: method,
        boosty_url: boosty_url || null,
        key_duration: parseInt(key_duration) || 600,
        return_url: requires_key ? return_url : null,
        share_url: requires_key ? share_url : null
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    return res.status(200).json({ 
      slug: data.slug, 
      loader: generateLoaderString(data),
      return_url: data.return_url,
      share_url: data.share_url
    });
  }

  return res.status(405).json({ error: 'method not allowed' });
};