#!/usr/bin/env python3
import re
import sys

def extract_skyport(mxe_file):
    """
    Extracts the SkyportEngine JavaScript logic from a ColorTouch .mxe file.
    """
    try:
        with open(mxe_file, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading file: {e}")
        return
    
    match = re.search(r'function SkyportEngine', content)
    if match:
        start = match.start()
        print(f"Found SkyportEngine at offset {start}")
        # Extract a large chunk encompassing the engine logic
        chunk = content[start:start+25000]
        output_file = 'skyport_logic.js'
        with open(output_file, 'w') as out:
            out.write(chunk)
        print(f"Extracted engine logic to {output_file}")
    else:
        print("SkyportEngine function signature not found.")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <stat.mxe>")
        sys.exit(1)
    extract_skyport(sys.argv[1])