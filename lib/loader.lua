-- LuaHub Loader
-- Ensure you have pure intentions before deobfuscating this code.
-- This code is protected by LuaHub.

local _url = "https://lua-axon.vercel.app/api/loader/YOUR_SCRIPT_SLUG"
local _api_url = "https://lua-axon.vercel.app/api/keys"
local _slug = "YOUR_SCRIPT_SLUG"

-- 1. Check for key
if not script_key then
    local _key_url = "https://lua-axon.vercel.app/key-system?slug=" .. _slug
    pcall(function() game:GetService("GuiService"):OpenBrowserWindow(_key_url) end)
    warn("[LuaHub] Key Required! Opening key page in your browser.")
    return
end

-- 2. Verify Key
local _verify_req = request or http_request or syn.request or fluxus.request
if _verify_req then
    local _res = _verify_req({
        Url = _api_url,
        Method = "POST",
        Headers = { ["Content-Type"] = "application/json" },
        Body = game:GetService("HttpService"):JSONEncode({
            action = "verify",
            key_string = script_key,
            slug = _slug
        })
    })
    
    local _data = game:GetService("HttpService"):JSONDecode(_res.Body)
    if _data.status ~= "success" then
        warn("[LuaHub] " .. (_data.error or "Invalid Key."))
        return
    end
    
    print("[LuaHub] Key Valid. Time Remaining: " .. tostring(_data.remaining) .. "s")
else
    -- Fallback if request library isn't available
    _url = _url .. "?key=" .. script_key
end

-- 3. Fetch Payload
local _success, _data = pcall(function()
    return game:HttpGet(_url, true)
end)

if not _success or not _data then
    warn("[LuaHub] Connection failed.")
    return
end

if string.sub(_data, 1, 2) == "--" then
    warn("[LuaHub] " .. _data)
    return
end

-- 4. Execute
local _func, _err = loadstring(_data)
if not _func then
    warn("[LuaHub] Execution blocked or corrupted payload.")
    return
end

-- Run the script
local _run, _runErr = pcall(_func)
if not _run then
    warn("[LuaHub] Runtime Error: " .. tostring(_runErr))
end