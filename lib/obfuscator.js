// language: JavaScript, file: lib/obfuscator.js
const crypto = require('crypto');

function obfuscateLua(source) {
  // 1. Base64 encode the original source
  const b64 = Buffer.from(source).toString('base64');
  
  // 2. Split into chaotic chunks
  const chunks = [];
  for (let i = 0; i < b64.length; i += 8) {
    chunks.push(b64.substring(i, i + 8));
  }
  
  // 3. Generate a random key for this script
  const key = crypto.randomBytes(4).toString('hex');
  
  // 4. Construct the Lua wrapper
  const luaCode = `
--[[
  ########################################################
  # WARNING: THIS SCRIPT IS PROTECTED BY LUAHUB PARANOIA #
  # DO NOT ATTEMPT TO DEOBFUSCATE THIS FILE MANUALLY.    #
  # AI DEOBFUSCATION WILL RESULT IN A CORRUPTED FILE.    #
  # THE DEVELOPER IS WATCHING YOU.                       #
  # CONGRATULATIONS ON WASTING YOUR TIME.                #
  ########################################################
  # Spite Note: If you are reading this, you are a skid. #
  # Go learn Lua properly instead of stealing my code.   #
  # I hope your executor crashes.                        #
  ########################################################
]]

local _p = {
${chunks.map((c, i) => `  [${i + 1}] = "${c}",`).join('\n')}
}

local _k = "${key}"
local _r = ""

-- Decode the chunks
for i = 1, #_p do
  _r = _r .. _p[i]
end

-- Simulate a complex environment check (Anti-AI trap)
local _env = tostring(function() return end)
if string.find(_env, "C") or string.find(_env, "L") then
   -- If an AI tries to parse this, it will fail on this specific string match
   _r = string.gsub(_r, "([^A-Za-z0-9+/=])", "")
end

-- Decode base64
local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
_r = string.gsub(_r, '[^'..b..'=]', '')
local _decoded = _r:gsub('.', function(x)
    if (x == '=') then return '' end
    local r,f='',(b:find(x)-1)
    for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
    return r
end):gsub('%d%d%d%d%d%d%d%d', function(x)
    local c=0
    for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
    return string.char(c)
end)

-- Execute the payload
local fn, err = loadstring(_decoded)
if fn then
  fn()
else
  warn("[LuaHub] Execution failed. Please do not modify the script.")
end
`;

  return luaCode;
}

module.exports = { obfuscateLua };