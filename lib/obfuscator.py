#!/usr/bin/env python3
import sys, os, subprocess, base64, random, hashlib

def compile_lua(lua_file):
    out = lua_file + ".out"
    # Compile with debug stripped
    subprocess.run(["luac", "-s", "-o", out, lua_file], check=True)
    with open(out, "rb") as f:
        data = f.read()
    os.remove(out)
    return data

def encrypt(data):
    # Generate a random 16-byte key
    key = [random.randint(1, 255) for _ in range(16)]
    
    # XOR encrypt
    enc = bytearray(b ^ key[i % 16] for i, b in enumerate(data))
    
    # Prepend key and Base64 encode
    return base64.b64encode(bytes(key) + bytes(enc)).decode("utf-8")

def main():
    if len(sys.argv) < 3:
        print("usage: python obfuscator.py input.lua output.bin")
        sys.exit(1)
    
    in_file, out_file = sys.argv[1], sys.argv[2]
    
    if not os.path.isfile(in_file):
        print(f"[!] File not found: {in_file}")
        sys.exit(2)
    
    print(f"[*] Compiling {in_file} to Lua 5.1 Bytecode...")
    bytecode = compile_lua(in_file)
    
    print(f"[*] Encrypting {len(bytecode)} bytes...")
    payload = encrypt(bytecode)
    
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(payload)
        
    print(f"[+] Success! Output written to {out_file}")
    print(f"[*] Size: {len(payload)} chars")

if __name__ == "__main__":
    main()