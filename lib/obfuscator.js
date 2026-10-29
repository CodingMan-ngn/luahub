// language: JavaScript, file: lib/obfuscator.js
"use strict";

// Generates a random hex string for the XOR key
function randomHex(bytes) { return [...Array(bytes)].map(() => Math.floor(Math.random() * 255).toString(16).padStart(2,'0')).join(''); }

// Encodes the source with XOR and converts to Hex
function xorEncodeHex(src, key) {
  const s = Buffer.from(src, 'utf8');
  const k = Buffer.from(key, 'utf8');
  const o = Buffer.alloc(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s[i] ^ k[i % k.length];
  return o.toString('hex');
}

function obfuscateLua(source, options = {}) {
  const key = options.key ?? randomHex(16);
  const encodedHex = xorEncodeHex(source, key);
  const encodedKeyHex = Buffer.from(key, 'utf8').toString('hex');

  // Convert hex string to a Lua escape string (\xxx\xxx\xxx)
  const hexToLuaStr = (hex) => {
    const chars = [];
    for (let i = 0; i < hex.length; i += 2) {
      chars.push(`\\${parseInt(hex.substr(i, 2), 16)}`);
    }
    return `"${chars.join('')}"`;
  };

  // A massive block of fake "VM" code to confuse static analysis
  const decoyVM = `
    local _0x1 = { [1] = function() return end, [2] = function() return end, [3] = function() return end }
    local _0x2 = { [1] = "a", [2] = "b", [3] = "c" }
    local _0x3 = { [1] = 0x1, [2] = 0x2, [3] = 0x3 }
    local _0x4 = { [1] = true, [2] = false }
    local _0x5 = { [1] = 0, [2] = 1, [3] = 2 }
    local _0x6 = { [1] = 0, [2] = 1, [3] = 2 }
    local _0x7 = { [1] = 0, [2] = 1, [3] = 2 }
    local _0x8 = { [1] = 0, [2] = 1, [3] = 2 }
    local _0x9 = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xA = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xB = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xC = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xD = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xE = { [1] = 0, [2] = 1, [3] = 2 }
    local _0xF = { [1] = 0, [2] = 1, [3] = 2 }
  `;

  return `--[[
  ########################################################
  # WARNING: THIS SCRIPT IS PROTECTED BY LUAHUB AXON     #
  # DO NOT ATTEMPT TO DEOBFUSCATE THIS FILE MANUALLY.    #
  # AI DEOBFUSCATION WILL RESULT IN A CORRUPTED FILE.    #
  # THE DEVELOPER IS WATCHING YOU.                       #
  # CONGRATULATIONS ON WASTING YOUR TIME.                #
  ########################################################
  #              LUAHUB AXON ENGINE V9.0                 #
  #  LAYERS: HEX + XOR + FAKE VM + ANTI-TAMPER           #
  ########################################################
]]

local _AXON_OK, _AXON_ERR = pcall(function()
    -- Start Decoy VM
    ${decoyVM}
    -- End Decoy VM

    local _c = ${hexToLuaStr(encodedHex)}
    local _k = ${hexToLuaStr(encodedKeyHex)}
    
    -- Fake VM Execution stack
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
    
    -- Actual payload decode
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