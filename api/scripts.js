const { supabase } = require('./_supabase');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 7);
}

function authUser(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

// A simple but effective string hexer to hide the payload
function hexEncode(str) {
  return Buffer.from(str, 'utf8').toString('hex');
}

function buildIntegratedScript(script, rawLua) {
  const apiBase = process.env.SITE_URL || 'https://lua-axon.vercel.app';
  
  // If no key system, just hex the raw script and load it
  if (!script.requires_key) {
    const hexed = hexEncode(rawLua);
    return `loadstring((function() local h='${hexed}'; local s=''; for i=1,#h,2 do s=s..string.char(tonumber(h:sub(i,i+1),16)) end; return s end)())()`;
  }

  // If Key System, we wrap the raw code in a function
  const hexedPayload = hexEncode(rawLua);

  const uiLoader = `
    local CONFIG = {
        ScriptSlug = "${script.slug}",
        ApiUrl = "${apiBase}/api/keys",
        AdsRequired = ${script.key_ads || 1},
        RedirectUrl = "${script.key_link || ''}",
        RawPayloadHex = "${hexedPayload}"
    }

    local CoreGui = game:GetService("CoreGui")
    local HttpService = game:GetService("HttpService")

    local function executePayload()
        local hex = CONFIG.RawPayloadHex
        local decoded = ""
        for i=1, #hex, 2 do
            decoded = decoded .. string.char(tonumber(hex:sub(i, i+1), 16))
        end
        local func, err = loadstring(decoded)
        if func then
            pcall(func)
        else
            warn("[LuaHub] Execution Error: " .. tostring(err))
        end
    end

    local function createUI()
        local ScreenGui = Instance.new("ScreenGui")
        ScreenGui.Name = "LuaHub_KeySystem"
        ScreenGui.ResetOnSpawn = false
        ScreenGui.Parent = CoreGui

        local Frame = Instance.new("Frame")
        Frame.Size = UDim2.new(0, 400, 0, 280)
        Frame.Position = UDim2.new(0.5, -200, 0.5, -140)
        Frame.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
        Frame.BorderSizePixel = 0
        Frame.Parent = ScreenGui

        local UICorner = Instance.new("UICorner")
        UICorner.CornerRadius = UDim.new(0, 12)
        UICorner.Parent = Frame

        local Title = Instance.new("TextLabel")
        Title.Size = UDim2.new(1, 0, 0, 50)
        Title.BackgroundTransparency = 1
        Title.Text = "${script.name} Keysystem"
        Title.TextColor3 = Color3.fromRGB(255, 255, 255)
        Title.Font = Enum.Font.GothamBold
        Title.TextSize = 20
        Title.Parent = Frame

        local Status = Instance.new("TextLabel")
        Status.Size = UDim2.new(1, -40, 0, 40)
        Status.Position = UDim2.new(0, 20, 0, 60)
        Status.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
        Status.TextColor3 = Color3.fromRGB(200, 200, 200)
        Status.Text = "Complete ${script.key_ads} ad(s) to continue."
        Status.Font = Enum.Font.Gotham
        Status.TextSize = 14
        Status.Parent = Frame

        local KeyBox = Instance.new("TextBox")
        KeyBox.Size = UDim2.new(1, -140, 0, 40)
        KeyBox.Position = UDim2.new(0, 20, 0, 120)
        KeyBox.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
        KeyBox.TextColor3 = Color3.fromRGB(255, 255, 255)
        KeyBox.PlaceholderText = "Paste your key..."
        KeyBox.Font = Enum.Font.Code
        KeyBox.TextSize = 14
        KeyBox.Parent = Frame

        local GetKeyBtn = Instance.new("TextButton")
        GetKeyBtn.Size = UDim2.new(0, 100, 0, 40)
        GetKeyBtn.Position = UDim2.new(1, -120, 0, 120)
        GetKeyBtn.BackgroundColor3 = Color3.fromRGB(50, 200, 100)
        GetKeyBtn.Text = "Get Key"
        GetKeyBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
        GetKeyBtn.Font = Enum.Font.GothamBold
        GetKeyBtn.TextSize = 14
        GetKeyBtn.Parent = Frame
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
        VerifyBtn.Parent = Frame
        
        return ScreenGui, KeyBox, VerifyBtn, Status
    end

    local ScreenGui, KeyBox, VerifyBtn, Status = createUI()

    VerifyBtn.MouseButton1Click:Connect(function()
        local key = KeyBox.Text
        if #key < 5 then
            Status.Text = "Invalid Key Format"
            return
        end

        Status.Text = "Verifying..."
        VerifyBtn.Text = "Verifying..."

        local req = request or http_request or syn.request or fluxus.request
        if not req then
            Status.Text = "Exploit doesn't support HTTP."
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
                Status.Text = "Valid! Loading..."
                VerifyBtn.Text = "Success!"
                task.wait(0.5)
                ScreenGui:Destroy()
                executePayload() -- Run the raw script that is stored in memory
            else
                Status.Text = data.error or "Invalid Key"
                VerifyBtn.Text = "Verify and Load Script"
            end
        else
            Status.Text = "Network Error"
            VerifyBtn.Text = "Verify and Load Script"
        end
    end)
  `.trim();

  return uiLoader;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('scripts')
      .select('id, name, slug, hits, requires_key, is_public_source, source_code, owner_name, created_at, obf_method, boosty_url, key_duration, key_ads, key_link')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const user = authUser(req);
    if (!user || !user.is_dev) return res.status(403).json({ error: 'Developer role required' });

    const { name, content, requires_key, key_ads, key_link } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name + content required' });

    const slug = slugify(name);
    
    // Create the script object first for the builder
    const scriptObj = { name, slug, requires_key: !!requires_key, key_ads: parseInt(key_ads) || 1, key_link };
    
    // Build the final integrated obfuscated string
    const finalLoader = buildIntegratedScript(scriptObj, content);

    const { data, error } = await supabase
      .from('scripts')
      .insert({
        owner_name: user.name,
        name,
        slug: slug,
        content_enc: finalLoader, // We store the completely built script
        requires_key: !!requires_key,
        obf_method: 'integrated',
        boosty_url: key_link,
        key_ads: parseInt(key_ads) || 1,
        key_link: key_link
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    
    // Return the actual loadstring the user will run
    const baseUrl = process.env.SITE_URL || 'https://lua-axon.vercel.app';
    return res.status(200).json({ 
      slug: data.slug, 
      loader: `loadstring(game:HttpGet("${baseUrl}/api/loader/${data.slug}"))()`
    });
  }

  return res.status(405).json({ error: 'method not allowed' });
};