-- ================================================================
--  LuaHub Loader — paste this in your executor
--  Change SLUG to your script's slug from the dashboard
-- ================================================================

local XOR_KEY = 0x5A
local SLUG    = "your-script-slug-here"   -- ← change this
local BASE    = "https://YOUR-PROJECT.vercel.app" -- ← change this

-- base64 decode (pure Lua, no deps)
local function b64decode(data)
    local alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    data = string.gsub(data, '[^'..alpha..'=]', '')
    return (data:gsub('.', function(x)
        if x == '=' then return '' end
        local r, f = '', (alpha:find(x) - 1)
        for i = 6, 1, -1 do
            r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0')
        end
        return r
    end):gsub('%d%d%d%d%d%d%d%d', function(x)
        local c = 0
        for i = 1, 8 do c = c + (x:sub(i,i) == '1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

-- XOR decode
local function xorDecode(data)
    local out = {}
    for i = 1, #data do
        out[i] = string.char(bit32.bxor(string.byte(data, i), XOR_KEY))
    end
    return table.concat(out)
end

-- fetch + decode + execute
local url     = BASE .. "/api/loader/" .. SLUG
local encoded = game:HttpGet(url, true)
local decoded = xorDecode(b64decode(encoded))
local fn, err = loadstring(decoded)
assert(fn, "[LuaHub] parse error: " .. tostring(err))
fn()
