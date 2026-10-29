-- loader.lua
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

-- GENERATED URL (This is inserted by the dashboard automatically)
local URL = "https://lua-axon.vercel.app/api/loader/YOUR_SLUG_HERE"

-- Check for user provided key
local user_key = nil
if script_key then
    user_key = script_key
end

local target_url = URL
if user_key then
    target_url = URL .. "?key=" .. user_key
end

local success, encoded_data = pcall(function()
    return game:HttpGet(target_url, true)
end)

if not success or string.find(encoded_data, "Key required") then
    warn("[LuaHub] Invalid or missing key. Please generate one.")
    return
elseif string.find(encoded_data, "Updating") then
    warn("[LuaHub] This script is currently updating. Join the Discord for updates.")
    return
end

local decrypted_bytecode = decrypt_payload(encoded_data)
local func, err = loadstring(decrypted_bytecode)
if not func then
    warn("[LuaHub] Bytecode execution failed.")
    return
end
func()