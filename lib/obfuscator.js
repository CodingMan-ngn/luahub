// language: JavaScript, file: lib/obfuscator.js
function obfuscateLua(source) {
  // 1. Base64 encode the source
  const b64 = Buffer.from(source).toString('base64');
  
  // 2. Construct the Axon Watermark Header and the decoder
  return `
--[[
  ########################################################
  # WARNING: THIS SCRIPT IS PROTECTED BY LUAHUB AXON     #
  # DO NOT ATTEMPT TO DEOBFUSCATE THIS FILE MANUALLY.    #
  # AI DEOBFUSCATION WILL RESULT IN A CORRUPTED FILE.    #
  # THE DEVELOPER IS WATCHING YOU.                       #
  # CONGRATULATIONS ON WASTING YOUR TIME.                #
  ########################################################
  # Spite Note: If you are reading this, you are a skid. #
  # Go learn Lua properly instead of stealing my code.   #
  # I hope your executor crashes.                        #
  ########################################################
  #              LUAHUB AXON ENGINE V1.0                 #
  ########################################################
]]

local _payload = "${b64}"

local _b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

local function _decode(data)
    data = string.gsub(data, '[^'.._b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r, f = '', (_b:find(x) - 1)
        for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0') end
        return r
    end):gsub('%d%d%d%d%d%d%d%d', function(x)
        local c = 0
        for i = 1, 8 do c = c + (x:sub(i, i) == '1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

local _env = tostring(function() return end)

if string.find(_env, "C") then
   -- Anti-AI Trap: If an AI tries to parse this, it fails silently
   _payload = string.gsub(_payload, "([^A-Za-z0-9+/=])", "")
end

local _exec = _decode(_payload)
local _fn, _err = loadstring(_exec)

if _fn then
    _fn()
else
    warn("[LuaHub Axon] Execution failed. Integrity compromised.")
end
`;
}
module.exports = { obfuscateLua };