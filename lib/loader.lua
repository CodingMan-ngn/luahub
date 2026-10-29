local BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

local function decode_base64(data)
    data = string.gsub(data, '[^'..BASE64_CHARS..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(BASE64_CHARS:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r
    end):gsub('%d%d%d%d%d%d%d%d', function(x)
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

local function decrypt_payload(encoded_str)
    local raw = decode_base64(encoded_str)
    local key = {}
    for i = 1, 16 do key[i] = string.byte(raw, i) end
    local decrypted = {}
    for i = 17, #raw do
        local b = string.byte(raw, i)
        decrypted[#decrypted+1] = string.char(bit32.bxor(b, key[((i-17) % 16) + 1]))
    end
    return table.concat(decrypted)
end

local URL_BASE = "https://lua-axon.vercel.app/api/loader/YOUR_SLUG_HERE"

local function show_update_gui()
    local ScreenGui = Instance.new("ScreenGui")
    local Frame = Instance.new("Frame")
    local Title = Instance.new("TextLabel")
    local Desc = Instance.new("TextLabel")
    local Button = Instance.new("TextButton")
    
    ScreenGui.Parent = game:GetService("CoreGui")
    ScreenGui.Name = "LuaHubUpdating"
    
    Frame.Parent = ScreenGui
    Frame.Size = UDim2.new(0, 350, 0, 200)
    Frame.Position = UDim2.new(0.5, -175, 0.5, -100)
    Frame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
    Frame.BackgroundTransparency = 0.1
    Frame.BorderSizePixel = 0
    Frame.Active = true
    Frame.Draggable = true
    
    local UICorner = Instance.new("UICorner")
    UICorner.CornerRadius = UDim.new(0, 12)
    UICorner.Parent = Frame

    Title.Parent = Frame
    Title.Size = UDim2.new(1, 0, 0, 50)
    Title.BackgroundTransparency = 1
    Title.Text = "⚠️ Script Updating"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.Font = Enum.Font.GothamBold
    Title.TextSize = 20
    
    Desc.Parent = Frame
    Desc.Size = UDim2.new(0.9, 0, 0, 60)
    Desc.Position = UDim2.new(0.05, 0, 0.25, 0)
    Desc.BackgroundTransparency = 1
    Desc.Text = "This script is currently being updated. Please join the Discord server for the latest version."
    Desc.TextColor3 = Color3.fromRGB(148, 163, 184)
    Desc.Font = Enum.Font.Gotham
    Desc.TextSize = 14
    Desc.TextWrapped = true
    
    Button.Parent = Frame
    Button.Size = UDim2.new(0.9, 0, 0, 40)
    Button.Position = UDim2.new(0.05, 0, 0.7, 0)
    Button.BackgroundColor3 = Color3.fromRGB(88, 101, 242)
    Button.Text = "Join Discord Server"
    Button.TextColor3 = Color3.fromRGB(255, 255, 255)
    Button.Font = Enum.Font.GothamBold
    Button.TextSize = 15
    
    local UICorner2 = Instance.new("UICorner")
    UICorner2.CornerRadius = UDim.new(0, 8)
    UICorner2.Parent = Button
    
    Button.MouseButton1Click:Connect(function()
        pcall(function()
            game:GetService("GuiService"):OpenBrowserWindow("https://discord.gg/P4P5jZGt3m")
        end)
    end)
end

local success, response = pcall(function()
    return game:HttpGet(URL_BASE, true)
end)

if success and string.find(response, "Updating") then
    show_update_gui()
elseif success and string.find(response, "Key required") then
    -- (Keep your existing Key System UI logic here)
elseif success and not string.find(response, "error") then
    local bytecode = decrypt_payload(response)
    local func, err = loadstring(bytecode)
    if func then func() end
end