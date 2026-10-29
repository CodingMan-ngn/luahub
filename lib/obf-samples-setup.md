# terrorlua/obfuscator-samples — reference corpus

    cd /d C:\Users\j2606\Desktop\luahub\lib
    git clone --depth 1 https://github.com/terrorlua/obfuscator-samples.git samples
    dir samples

Each folder is a distinct obf pipeline sample. Use as reference for upgrading
lib/obfuscator.py beyond rolling-XOR:

Tier 1 (current): bytecode + rolling XOR
Tier 2: string pool encryption + runtime trampoline
Tier 3: control-flow flattening (switch-state)
Tier 4: custom VM (Luraph / Moonsec class)