#!/usr/bin/env python3
import sys
import os
import subprocess
import shutil

def find_jffs2_offset(filename):
    """
    Scans the binary file for the JFFS2 magic signature (0x8519 - Little Endian).
    Returns the offset of the first valid JFFS2 node header (Dirent or Inode).
    """
    print(f"[*] Scanning {filename} for JFFS2 start...")
    try:
        with open(filename, 'rb') as f:
            data = f.read()
    except FileNotFoundError:
        print(f"[!] File {filename} not found.")
        return None

    # JFFS2 Magic (Little Endian)
    magic = b'\x85\x19'
    off = 0
    
    while True:
        off = data.find(magic, off)
        if off == -1: break
        
        # Check node type (next 2 bytes after magic)
        # 0x1985 (Magic) + Type
        # Common types: 
        # JFFS2_NODETYPE_DIRENT = 0xE001 -> LE: 01 E0
        # JFFS2_NODETYPE_INODE  = 0xE002 -> LE: 02 E0
        
        if off + 4 <= len(data):
            nodetype = data[off+2:off+4]
            if nodetype in [b'\x01\xe0', b'\x02\xe0']: 
                print(f"[+] Found JFFS2 start candidate at offset: {off} (0x{off:X})")
                return off
        
        # Advance to avoid infinite loop on same byte
        off += 2
        
    return None

def unpack(firmware_path, output_base_dir):
    """
    Extracts the JFFS2 partition and unpacks it using Jefferson.
    """
    offset = find_jffs2_offset(firmware_path)
    if offset is None:
        print("[-] Could not find JFFS2 partition start.")
        sys.exit(1)
        
    print(f"[*] Extracting JFFS2 partition from offset {offset}...")
    
    if not os.path.exists(output_base_dir):
        os.makedirs(output_base_dir)
        
    jffs2_bin = os.path.join(output_base_dir, "jffs2.bin")
    fs_root = os.path.join(output_base_dir, "fs_root")

    # Clean up previous run
    if os.path.exists(fs_root):
        print(f"[*] Cleaning up existing directory: {fs_root}")
        shutil.rmtree(fs_root)

    # 1. Extract the partition using dd (handled via python for portability)
    # We read from offset to end of file. JFFS2 usually handles trailing garbage (0xFF) well.
    try:
        with open(firmware_path, 'rb') as f_in, open(jffs2_bin, 'wb') as f_out:
            f_in.seek(offset)
            shutil.copyfileobj(f_in, f_out)
    except Exception as e:
        print(f"[!] Extraction failed: {e}")
        sys.exit(1)
        
    print(f"[*] Partition extracted to {jffs2_bin}")
    print(f"[*] Unpacking with Jefferson...")

    # 2. Run Jefferson
    # Ensure 'jefferson' is in your PATH or current venv
    try:
        subprocess.run(["jefferson", "-d", fs_root, jffs2_bin], check=True)
        print(f"[+] Success! Filesystem unpacked to: {fs_root}")
    except subprocess.CalledProcessError:
        print("[!] Jefferson unpacking failed. Ensure 'jefferson' is installed and valid.")
        sys.exit(1)
    except FileNotFoundError:
        print("[!] 'jefferson' command not found. Please install it (pip install jefferson).")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <firmware_file> [output_directory]")
        sys.exit(1)
    
    fw_file = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else f"{fw_file}_unpacked"
    
    unpack(fw_file, out_dir)
