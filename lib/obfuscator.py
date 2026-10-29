#!/usr/bin/env python3
# obfuscator.py - compile Lua 5.1 -> strip debug -> rolling XOR -> base64
# usage: python obfuscator.py input.lua output.bin
import sys, os, subprocess, base64, random

LUAC = r"C:\lua51\luac.exe"

def compile_lua(lua_file):
    out = lua_file + ".out"
    subprocess.run([LUAC, "-s", "-o", out, lua_file], check=True)
    with open(out, "rb") as f:
        data = f.read()
    os.remove(out)
    return data

def encrypt(data):
    key = [random.randint(1, 255) for _ in range(16)]
    enc = bytearray(b ^ key[i % 16] for i, b in enumerate(data))
    return base64.b64encode(bytes(key) + bytes(enc)).decode("utf-8")

def main():
    if len(sys.argv) < 3:
        print("usage: python obfuscator.py input.lua output.bin")
        sys.exit(1)
    in_file, out_file = sys.argv[1], sys.argv[2]
    if not os.path.isfile(in_file):
        print(f"[!] input not found: {in_file}")
        sys.exit(2)
    print(f"[*] compiling {in_file} ...")
    bytecode = compile_lua(in_file)
    print(f"[*] encrypting ({len(bytecode)} bytes) ...")
    payload = encrypt(bytecode)
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(payload)
    print(f"[+] wrote {out_file} ({len(payload)} chars)")

if __name__ == "__main__":
    main()