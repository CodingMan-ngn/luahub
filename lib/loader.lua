-- loader.lua - paste into executor
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

local SLUG = "your-script-slug"
local URL = "https://your-app.vercel.app/api/loader/" .. SLUG
if script_key then URL = URL .. "?key=" .. script_key end

local ok, encoded_data = pcall(function()
    return game:HttpGet(URL, true)
end)

if not ok then warn("[LuaHub] Failed to fetch payload.") return end
if encoded_data:sub(1,2) == "--" then warn("[LuaHub] " .. encoded_data) return end

local decrypted_bytecode = decrypt_payload(encoded_data)
local func, err = loadstring(decrypted_bytecode)
if not func then warn("[LuaHub] Bytecode execution failed: " .. tostring(err)) return end
func()