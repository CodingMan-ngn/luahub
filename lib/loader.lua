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

local function execute_payload(data)
    local bytecode = decrypt_payload(data)
    local func, err = loadstring(bytecode)
    if func then
        func()
    else
        warn("[LuaHub] Bytecode error: " .. tostring(err))
    end
end

local success, response = pcall(function()
    return game:HttpGet(URL_BASE, true)
end)

if success and string.find(response, "Key required") then
    
    local ScreenGui = Instance.new("ScreenGui")
    local Frame = Instance.new("Frame")
    local TextBox = Instance.new("TextBox")
    local Button = Instance.new("TextButton")
    local Title = Instance.new("TextLabel")
    
    ScreenGui.Parent = game:GetService("CoreGui")
    ScreenGui.Name = "LuaHubKeyUI"
    
    Frame.Parent = ScreenGui
    Frame.Size = UDim2.new(0, 320, 0, 180)
    Frame.Position = UDim2.new(0.5, -160, 0.5, -90)
    Frame.BackgroundColor3 = Color3.fromRGB(15, 15, 20)
    Frame.BorderSizePixel = 0
    Frame.Active = true
    Frame.Draggable = true
    
    Title.Parent = Frame
    Title.Size = UDim2.new(1, 0, 0, 40)
    Title.BackgroundTransparency = 1
    Title.Text = "LuaHub Key System"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.Font = Enum.Font.GothamBold
    Title.TextSize = 18
    
    TextBox.Parent = Frame
    TextBox.Size = UDim2.new(0.9, 0, 0, 40)
    TextBox.Position = UDim2.new(0.05, 0, 0.25, 0)
    TextBox.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
    TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
    TextBox.PlaceholderText = "Paste your key here..."
    TextBox.Font = Enum.Font.Gotham
    TextBox.TextSize = 14
    
    Button.Parent = Frame
    Button.Size = UDim2.new(0.9, 0, 0, 40)
    Button.Position = UDim2.new(0.05, 0, 0.6, 0)
    Button.BackgroundColor3 = Color3.fromRGB(124, 58, 237)
    Button.Text = "Submit Key"
    Button.TextColor3 = Color3.fromRGB(255, 255, 255)
    Button.Font = Enum.Font.GothamBold
    Button.TextSize = 15
    
    Button.MouseButton1Click:Connect(function()
        local userKey = TextBox.Text
        if #userKey < 5 then return end
        
        local new_url = URL_BASE .. "?key=" .. userKey
        local retry_success, retry_data = pcall(function()
            return game:HttpGet(new_url, true)
        end)
        
        if retry_success and not string.find(retry_data, "error") then
            ScreenGui:Destroy()
            execute_payload(retry_data)
        else
            TextBox.Text = ""
            TextBox.PlaceholderText = "Invalid Key!"
            task.wait(2)
            TextBox.PlaceholderText = "Paste your key here..."
        end
    end)

elseif success and not string.find(response, "error") then
    execute_payload(response)
else
    warn("[LuaHub] Fetch error: " .. tostring(response))
end