#!/usr/bin/env python3
"""
obf.py — Local Lua obfuscator + XOR encoder
Usage: python3 obf.py input.lua output.enc
The .enc file is what you upload / paste as script content.
"""

import sys, os, re, random, string, base64

XOR_KEY = 0x5A  # must match loader XOR_KEY

def xor_encode(data: bytes, key: int) -> bytes:
    return bytes(b ^ key for b in data)

def inject_junk(src: str) -> str:
    lines = src.splitlines()
    out = []
    for line in lines:
        out.append(line)
        if random.random() < 0.25:
            jv = ''.join(random.choices(string.ascii_lowercase, k=random.randint(4,9)))
            out.append(f"--[[ {jv} = {random.randint(0, 0xFFFF)} ]]")
    return "\n".join(out)

def rename_locals(src: str) -> str:
    seen = {}
    ctr  = [0]
    def mangle(n):
        if n not in seen:
            seen[n] = f"_L{ctr[0]:04x}"
            ctr[0] += 1
        return seen[n]
    def rep(m):
        orig = m.group(1)
        return m.group(0).replace(orig, mangle(orig))
    src = re.sub(r'\blocal\s+([a-zA-Z_]\w*)\s*=', rep, src)
    for orig, mangled in seen.items():
        src = re.sub(r'\b' + re.escape(orig) + r'\b', mangled, src)
    return src

def encode_strings(src: str) -> str:
    def enc(m):
        s = m.group(1)
        return '"' + ''.join(f'\\{ord(c)}' for c in s) + '"'
    return re.sub(r'"([^"\\]*)"', enc, src)

def obfuscate(src: str) -> str:
    src = inject_junk(src)
    src = rename_locals(src)
    src = encode_strings(src)
    return src

def main():
    if len(sys.argv) < 3:
        print("usage: python3 obf.py input.lua output.enc")
        sys.exit(1)
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        src = f.read()
    obfed   = obfuscate(src)
    raw     = obfed.encode('utf-8')
    encoded = base64.b64encode(xor_encode(raw, XOR_KEY)).decode('ascii')
    with open(sys.argv[2], 'w', encoding='utf-8') as f:
        f.write(encoded)
    print(f"[obf] {len(raw)} bytes → {sys.argv[2]}  (key=0x{XOR_KEY:02X})")

if __name__ == "__main__":
    main()
