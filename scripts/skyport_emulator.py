#!/usr/bin/env python3
import socket
import ssl
import json
import struct
import time
import sys
import threading

"""
Skyport Client Emulator
Implements the ColorTouch Cloud Protocol including mTLS and "Setup Cluster" handshake.
Allows for full device impersonation given a MAC address.
"""

# Default Configuration
ENTRY_HOST = "connectcl.skyport.io" 
ENTRY_PORT = 9002

# Expected file structure from an unpacked firmware
# Use universal_unpack.py to get these.
CLIENT_CERT = "certs/skyport_public.pem"
CLIENT_KEY = "certs/skyport_private.pem"
CA_CERT = "certs/skyport_root.pem"

# Command IDs
CMD_PING = 1
CMD_LOGIN = 2
CMD_LOGINACK = 3
CMD_LOGINIDLE = 4
CMD_SUBSCRIPTIONSETUP = 9
CMD_SUBSCRIPTIONRESPONSE = 10
CMD_SUBSCRIPTIONALERT = 11
CMD_NOTIFICATIONSETUP = 13
CMD_NOTIFICATIONRESPONSE = 14
CMD_NOTIFICATIONALERT = 15
CMD_READ = 17
CMD_READRESPONSE = 18
CMD_WRITE = 20
CMD_WRITERESPONSE = 21
CMD_SCHEDULEGET = 36
CMD_SCHEDULEDATA = 37
CMD_DATETIMESETUP = 45
CMD_DATETIMERESPONSE = 46
CMD_FIRMWARECHECK = 61
CMD_PAIRREQUEST = 74

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")
    sys.stdout.flush()

def build_packet(payload_dict):
    json_str = json.dumps(payload_dict, separators=(',', ':')) 
    data = json_str.encode('utf-8')
    length = len(data)
    header = struct.pack('>I', length)
    return header + data

def read_exact(sock, num_bytes):
    buf = b''
    while len(buf) < num_bytes:
        try:
            chunk = sock.recv(num_bytes - len(buf))
            if not chunk:
                return buf
            buf += chunk
        except socket.timeout:
            return None
        except Exception as e:
            log(f"Read error: {e}", "ERR")
            return None
    return buf

def is_ascii(b):
    if not b: return False
    return all(32 <= c <= 126 for c in b)

class SkyportClient:
    def __init__(self, host, port, mac, guid, fw_ver, model, state_name="DISCONNECTED"):
        self.host = host
        self.port = port
        self.mac = mac
        self.guid = guid
        self.full_id = f"{mac}:{guid}"
        self.fw_ver = fw_ver
        self.model = model
        self.state_name = state_name
        
        self.ssock = None
        self.running = False
        self.sequence_num = 0
        
        # Mock device state
        self.state = {
            "eq_spaceTemp": 72,
            "hm_mode": 1, 
            "hm_csp": 75,
            "hm_hsp": 68,
            "ui_statName": "EMULATED_DEVICE",
            "away": 0,
            "ui_statSchedActive": 1,
        }

    def next_sequence(self):
        self.sequence_num = (self.sequence_num + 1) % 1025
        return self.sequence_num

    def send_packet(self, payload):
        if "sequence" not in payload and payload["command"] not in [CMD_PING, CMD_LOGIN]:
            payload["sequence"] = self.next_sequence()
        
        packet = build_packet(payload)
        log(f"SEND: {json.dumps(payload)}", "SEND")
        self.ssock.sendall(packet)

    def ping_thread(self):
        while self.running:
            time.sleep(60)
            if self.running:
                try:
                    self.send_packet({"command": CMD_PING})
                except:
                    break

    def send_setup_cluster(self):
        log("Sending Setup Cluster...", "INFO")
        self.send_packet({"command": CMD_SUBSCRIPTIONSETUP})
        self.send_packet({"command": CMD_NOTIFICATIONSETUP})
        self.send_packet({"command": CMD_DATETIMESETUP})
        self.send_packet({"command": CMD_FIRMWARECHECK})

    def run(self):
        log(f"Connecting to {self.host}:{self.port} (State: {self.state_name})...", "CONN")
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        context.load_cert_chain(certfile=CLIENT_CERT, keyfile=CLIENT_KEY)
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE 
        
        try:
            raw_sock = socket.create_connection((self.host, self.port), timeout=15)
            self.ssock = context.wrap_socket(raw_sock, server_hostname=self.host)
            log("SSL Handshake Successful", "SSL")
            
            if self.state_name == "DISCONNECTED":
                # Entry host: Expect redirect string
                self.ssock.settimeout(10.0)
                data = self.ssock.recv(1024)
                if data and is_ascii(data):
                    full = data.decode('utf-8', errors='ignore').strip()
                    if ":" in full and "{" not in full:
                        new_host, new_port = full.split(":")
                        log(f"Redirect -> {new_host}:{new_port}", "INFO")
                        self.ssock.close()
                        new_client = SkyportClient(new_host, int(new_port), self.mac, self.guid, self.fw_ver, self.model, state_name="LOGIN")
                        new_client.run()
                        return
                log("Failed to receive redirect, attempting login anyway...", "WARN")

            # Perform Login
            self.send_packet({
                "command": CMD_LOGIN,
                "mac": self.full_id,
                "fwVer": self.fw_ver,
                "model": self.model
            })
            
            self.running = True
            threading.Thread(target=self.ping_thread, daemon=True).start()

            while self.running:
                header = read_exact(self.ssock, 4)
                if header is None: continue 
                if not header: break
                
                length = struct.unpack('>I', header)[0]
                payload = read_exact(self.ssock, length)
                if not payload: break
                
                msg = json.loads(payload.decode('utf-8'))
                log(f"RECV: {json.dumps(msg)}", "RECV")
                
                cmd = msg.get("command")
                
                if cmd == CMD_LOGINACK:
                    log("Authenticated!", "SUCCESS")
                    self.send_setup_cluster()
                    
                elif cmd == CMD_LOGINIDLE:
                    log("Not commissioned. Paired account required.", "WARN")
                    self.send_setup_cluster() 
                    
                elif cmd == CMD_WRITE:
                    # Echo back for confirmation
                    self.send_packet({
                        "command": CMD_WRITERESPONSE,
                        "sequence": msg.get("sequence"),
                        "data": msg.get("data")
                    })
                
                elif cmd == CMD_READ:
                    indexes = msg.get("indexes", [])
                    response_data = {idx: self.state.get(idx, 0) for idx in indexes}
                    self.send_packet({
                        "command": CMD_READRESPONSE,
                        "sequence": msg.get("sequence"),
                        "data": response_data
                    })

        except Exception as e:
            log(f"Error: {e}", "ERR")
        finally:
            self.running = False
            if self.ssock: self.ssock.close()
            log("Disconnected.", "CONN")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <MAC> [GUID] [FW_VER] [MODEL]")
        print("Example: 0023A73AB272 12345678 VR4.08 5800")
        sys.exit(1)

    mac = sys.argv[1]
    guid = sys.argv[2] if len(sys.argv) > 2 else "12345678"
    fw_ver = sys.argv[3] if len(sys.argv) > 3 else "VR4.08"
    model = sys.argv[4] if len(sys.argv) > 4 else "5800"

    client = SkyportClient(ENTRY_HOST, ENTRY_PORT, mac, guid, fw_ver, model)
    client.run()
