#!/usr/bin/env python3
# vm_wrap.py - shell to an external obfuscator. Prometheus first (free), MoonSec/Luraph swap-in later.
import sys, os, subprocess

PROMETHEUS_DIR = os.environ.get("PROMETHEUS_DIR", r"C:\luahub\lib\Prometheus")

def prometheus(in_file, out_file):
    # Prometheus CLI: lua prometheus.lua --preset Medium input.lua output.lua
    # clone https://github.com/prometheus-lua/Prometheus into PROMETHEUS_DIR
    cli = os.path.join(PROMETHEUS_DIR, "prometheus.lua")
    subprocess.run(
        ["lua", cli, "--preset", "Medium", in_file, out_file],
        check=True, timeout=120
    )

def main():
    if len(sys.argv) < 3:
        print("usage: vm_wrap.py input.lua output.lua")
        sys.exit(1)
    prometheus(sys.argv[1], sys.argv[2])

if __name__ == "__main__":
    main()