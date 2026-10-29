-- test_loader.lua
bit32 = { bxor = function(a,b)
    local r,p = 0,1
    for _=1,32 do local aa,bb = a%2,b%2
        if aa~=bb then r=r+p end
        a=(a-aa)/2; b=(b-bb)/2; p=p*2
    end
    return r
end }

game = { HttpGet = function(self, url)
    local h = io.popen('curl -s "'..url..'"')
    local body = h:read("*a"); h:close()
    return body
end }

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

local URL = "http://127.0.0.1:8080/api/loader/hello"
local encoded_data = game:HttpGet(URL)
if not encoded_data or #encoded_data < 20 then
    error("[loader] fetch returned empty — is serve.py running on :8080?")
end
local decrypted_bytecode = decrypt_payload(encoded_data)
local func, err = loadstring(decrypted_bytecode)
if not func then error("[loader] bytecode load failed: "..tostring(err)) end
func()