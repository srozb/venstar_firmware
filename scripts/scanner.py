#!/usr/bin/env python3
import sys
import os

def scan_jffs2(filename):
    """
    Scans a binary file for JFFS2 magic headers (LE and BE) and identifies
    likely partition starts based on node clustering.
    """
    if not os.path.exists(filename):
        print(f"Error: File '{filename}' not found.")
        return

    print(f"[*] Scanning {filename} for JFFS2 magic headers...")
    
    with open(filename, 'rb') as f:
        data = f.read()

    magics = {
        'Little Endian (0x8519)': b'\x85\x19',
        'Big Endian (0x1985)':    b'\x19\x85'
    }

    # Node types: 0xE001 (Dirent), 0xE002 (Inode), 0xE003 (Cleanmarker), 0xE004 (Padding)
    # LE: 01 E0, 02 E0, 03 E0, 04 E0
    # BE: E0 01, E0 02, E0 03, E0 04
    valid_nodes_le = [b'\x01\xe0', b'\x02\xe0', b'\x03\xe0']
    valid_nodes_be = [b'\xe0\x01', b'\xe0\x02', b'\xe0\x03']

    for desc, magic in magics.items():
        print(f"\n[+] Searching for {desc}...")
        candidates = []
        off = 0
        while True:
            off = data.find(magic, off)
            if off == -1: break
            
            # Verify node type
            if off + 4 <= len(data):
                node_type = data[off+2:off+4]
                if (magic == b'\x85\x19' and node_type in valid_nodes_le) or \
                   (magic == b'\x19\x85' and node_type in valid_nodes_be):
                    candidates.append(off)
            off += 2

        if not candidates:
            print(f"    No valid nodes found for {desc}.")
            continue

        print(f"    Found {len(candidates)} valid headers.")
        
        # Identify distinct regions (clusters of nodes)
        last_off = -100000
        regions = []
        for c in candidates:
            if c > last_off + 65536: # If gap > 64KB, likely a new partition or block
                regions.append(c)
            last_off = c
            
        for start in regions:
            print(f"    Possible Filesystem Start: {start} (0x{start:X})")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <binary_file>")
        sys.exit(1)
    
    scan_jffs2(sys.argv[1])
