@echo off
setlocal
title Prometheus Local Obfuscator
cd /d "%~dp0"

echo ==================================================
echo       LuaHub Local Obfuscator (Prometheus)
echo ==================================================
echo.
echo 1. Paste your raw Lua code into a file called "input.lua"
echo 2. Save it, then press any key to obfuscate.
echo.
pause > nul

if not exist input.lua (
    echo [ERROR] input.lua not found! Please create it and paste your code inside.
    pause
    exit /b
)

echo.
echo Obfuscating... this may take a few seconds.

:: Copy input into the Prometheus folder
copy input.lua Prometheus\in.lua > nul

:: Move into Prometheus and run the obfuscator
cd Prometheus
lua prometheus-main.lua --preset Medium --out out.lua in.lua

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Obfuscation failed.
    cd ..
    pause
    exit /b
)

:: Move the output back
copy out.lua ..\output.lua > nul
cd ..

:: Clean up
del Prometheus\in.lua
del Prometheus\out.lua

echo.
echo [SUCCESS] Obfuscation complete!
echo The obfuscated code is in output.lua and has been copied to your clipboard.
type output.lua | clip
echo.
pause