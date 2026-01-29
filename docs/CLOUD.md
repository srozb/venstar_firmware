# Skyport Cloud Protocol Analysis

## 1. Overview
The Venstar ColorTouch thermostats communicate with the Skyport Cloud service using a custom binary protocol over TLS (Mutual TLS).

*   **Host:** `connectcl.skyport.io` (Legacy / Platform 1)
*   **Port:** `9002`
*   **Authentication:** mTLS using a shared RSA private key (`skyport_private.pem`) leaked in `VR` firmware.
*   **Identity:** MAC Address (provided in the `LOGIN` packet).

## 2. Framing & Packet Structure
Packets are framed with a 4-byte big-endian length header followed by a JSON payload.

```
[ 4 Bytes Length (Big-Endian) ] [ JSON Payload ]
```

**Exception:** The initial **Redirect** packet is a raw ASCII string `hostname:port` without JSON framing.

## 3. Connection Handshake

### 3.1. Gateway Redirection
1.  Device connects to `connectcl.skyport.io:9002`.
2.  Server sends a raw ASCII redirect string (e.g., `connectjs.skyport.io:41414`).
3.  Device reconnects to the new host.

### 3.2. Login & Authentication
The device identifies itself using its MAC address.

**Command:** `2` (LOGIN)
**Payload:**
```json
{
  "command": 2,
  "mac": "0023A7XXXXXX:12345678",
  "fwVer": "VR4.08",
  "model": "5800"
}
```
*Note: The string after the colon is a GUID usually generated at first boot.*

### 3.3. Session Initialization (The Setup Cluster)
After receiving `LOGINACK` (3), the device **must** send the following to initialize the cloud session:
*   **Command 9 (`SUBSCRIPTIONSETUP`):** Requests variable monitoring.
*   **Command 13 (`NOTIFICATIONSETUP`):** Requests alert thresholds.
*   **Command 45 (`DATETIMESETUP`):** Syncs time.
*   **Command 61 (`FIRMWARECHECK`):** Version check.

## 4. Operational Commands

| ID | Name | Direction | Description |
|---|---|---|---|
| 1 | `PING` | Both | Heartbeat. Server responds with PING + `sequence: 1`. |
| 3 | `LOGINACK` | S -> C | Authentication successful. |
| 4 | `LOGINIDLE` | S -> C | Auth successful but device not paired to account. |
| 11 | `SUBSCRIPTIONALERT`| C -> S | **Push Data.** Used to report temperature/sensors. |
| 17 | `READ` | S -> C | Cloud requests specific data indexes. |
| 18 | `READRESPONSE` | C -> S | Response to `READ`. |
| 20 | `WRITE` | S -> C | Cloud pushes a setting change (e.g. Fan ON). |
| 21 | `WRITERESPONSE` | C -> S | **ACK** for `WRITE`. Must mirror the data sent. |
| 36 | `SCHEDULEGET` | S -> C | Cloud requests the 7-day schedule. |
| 37 | `SCHEDULEDATA` | C -> S | Response containing schedule object. |
| 38 | `MESSAGES` | S -> C | Displays a remote text message on the device screen. |
| 48 | `FIRMWARERESPONSE` | S -> C | **Remote Update.** Triggers download/install of filesystem. |
| 74 | `PAIRREQUEST` | C -> S | Request a 6-digit pairing code. |
| 5 | `COMMISSIONING` | S -> C | Contains the pairing code in `msg`. |
| 93 | `SNAPSHOTPUSH` | S -> C | **Bulk Write.** Overwrites many DB/DataMap settings. |
| 160-162| `SYSTER` | - | Placeholder/Unimplemented in client JS engine. |

## 5. High-Risk Remote Functionality

### 5.1. Remote Firmware Injection (Command 48)
If the cloud sends a `FIRMWARERESPONSE` (48) with the field `"force": true`, the device will:
1.  Connect to the provided `host` and `port`.
2.  Provide its current `version` and a `token`.
3.  Download a `zip` file containing a new filesystem.
4.  **Silent Takeover:** Automatically extract and overwrite system files (like `stat.mxe`) and **reboot**. 
This is effectively a built-in RCE for the cloud provider.

### 5.2. Identity/Security Overwrite (Command 93)
Through Command 93, the cloud can update sensitive fields in the `guidata` database:
*   `ui_passCode`: Changes the user's 4-digit screen lock PIN.
*   `apiAuthUser` / `apiAuthPassword`: Rotates Local API credentials.
*   `ui_statScreenLockActive`: Remotely locks/unlocks the physical UI.

## 6. Security Vulnerability: MAC-Based Takeover
The protocol has a fundamental design flaw: **Identity is asserted, not proven.**

1.  **Shared Credential:** Since the mTLS private key is shared across the entire product line, the TLS layer only proves "I am a Venstar device," not "I am Thermostat X."
2.  **Weak Identity:** The `mac` field in the `LOGIN` packet is the only thing linking the connection to a specific user account.
3.  **Impersonation:** An attacker can connect with the leaked key and send a `LOGIN` packet with a victim's MAC address. The cloud will immediately treat the attacker as the victim's device, pushing all user settings to the attacker and accepting any changes the attacker pushes back.