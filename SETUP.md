# LuaHub Setup

## Prereqs
- Node.js LTS
- Python 3
- Lua 5.1 binaries at C:\lua51\luac.exe
- Supabase project + Vercel account

## Install
    npm install

## Supabase
1. SQL Editor -> paste schema_v2.sql -> Run
2. Project Settings -> API -> copy URL + service_role key

## Vercel env
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- JWT_SECRET (random long string)
- BOOSTYLINK_API_KEY

## Promote yourself to developer
    update users set role = 'developer', verified = true where username = 'you';

## Obfuscate a script
    cd lib
    python obfuscator.py myscript.lua myscript.bin
Paste the .bin into dashboard Deploy.

## Deploy
    git add .
    git commit -m "update"
    git push
    vercel --prod