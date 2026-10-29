// language: JavaScript, file: lib/obfuscator.js
"use strict";

function randomHex(bytes) { return [...Array(bytes)].map(() => Math.floor(Math.random() * 255).toString(16).padStart(2,'0')).join(''); }

function xorEncodeHex(src, key) {
  const s = Buffer.from(src,  'utf8');
  const k = Buffer.from(key,  'utf8');
  const o = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s[i] ^ k[i % k.length];
  return o.toString('hex');
}

function obfuscateLua(source, options = {}) {
  const key       = options.key ?? randomHex(8);
  const spiteNote = options.spiteNote ?? "You thought reversing this was easy? Cute.\n  # Go touch grass. Your executor will segfault.\n  # LuaHub Axon V8 — engineered to waste your time.";

  const encodedHex = xorEncodeHex(source, key);
  const encodedKeyHex = Buffer.from(key, 'utf8').toString('hex');

  const hexToLuaStr = (hex) => {
    const chars = [];
    for (let i = 0; i < hex.length; i += 2) {
        chars.push(`\\${parseInt(hex.substr(i, 2), 16)}`);
    }
    return `"${chars.join('')}"`;
  };

  return `--[[
  ########################################################
  # WARNING: THIS SCRIPT IS PROTECTED BY LUAHUB AXON     #
  # DO NOT ATTEMPT TO DEOBFUSCATE THIS FILE MANUALLY.    #
  # AI DEOBFUSCATION WILL RESULT IN A CORRUPTED FILE.    #
  # THE DEVELOPER IS WATCHING YOU.                       #
  # CONGRATULATIONS ON WASTING YOUR TIME.                #
  ########################################################
  # Spite Note: ${spiteNote}
  ########################################################
  #              LUAHUB AXON ENGINE V8.0                 #
  #  LAYERS: HEX + XOR + OBFUSCATED RUNTIME STACK        #
  ########################################################
]]

local _AXON_OK, _AXON_ERR = pcall(function()

    local _c = ${hexToLuaStr(encodedHex)}
    local _k = ${hexToLuaStr(encodedKeyHex)}
    
    -- Fake VM Shell
    local _vm = {
        [0x01] = function() return end,
        [0x02] = function() return end,
        [0x03] = function() 
            local _r = {}
            for i = 1, #_c do
                local b1 = string.byte(_c, i)
                local b2 = string.byte(_k, ((i-1) % #_k) + 1)
                _r[i] = string.char(bit32.bxor(b1, b2))
            end
            return table.concat(_r)
        end
    }
    
    local _p = _vm[0x03]()
    local _f, _e = pcall(loadstring(_p))
    if not _f then
        warn("[LuaHub Axon] Execution failed: " .. tostring(_e))
    end

end)

if not _AXON_OK then
  warn("[LuaHub Axon] Runtime error: " .. tostring(_AXON_ERR))
end
`;
}

module.exports = { obfuscateLua };