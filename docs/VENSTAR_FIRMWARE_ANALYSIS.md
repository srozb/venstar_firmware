# Venstar Firmware Security Analysis

## 1. Executive Summary
A comprehensive analysis of multiple Venstar thermostat firmware versions (`VC`, `VR`, `VW`) has identified several security concerns.

*   **Private RSA Key Leak:** The `VR` firmware image contains the device's **Private RSA Key** (`skyport_private.pem`) in plaintext. This key matches a shared "Legacy Device" certificate used for mutual TLS (mTLS) authentication with the Skyport cloud.
*   **Weak Authentication (MAC-only Takeover):** The cloud protocol relies primarily on the device's MAC address for identity. Combined with the shared private key, this may allow for unauthorized device impersonation.
*   **Potential Input Validation Weakness:** A theoretical vulnerability may exist in the handling of the `apiAuthUser` parameter within the Local API. This has not been verified in a live environment.
*   **Physical Backdoors:** Hardcoded backdoors allow screen unlocking and PIN resetting via SD card.
*   **Cloud Protocol Analysis:** The cloud communication protocol has been reverse engineered, revealing extensive remote administrative capabilities.

## 2. Findings

### 2.1. Leaked Private RSA Key (`VR` Firmware)
**Affected Firmware:** `VR` (Venstar Residential, Platform 1, Model T5800)
**File Path:** `/home/secure/skyport_private.pem`

The `Update.bin` firmware image for the `VR` series contains a 4096-bit RSA Private Key and a corresponding Client Certificate.

*   **Key Type:** RSA Private Key (4096 bit).
*   **Certificate Subject:** `CN=CT1_LEGACY_DEVICE`, `O=Venstar Inc.`
*   **Issuer:** `Skyport Legacy Root CA`.
*   **Impact:** The Common Name `CT1_LEGACY_DEVICE` indicates this is likely a shared key across many legacy ColorTouch devices. An attacker can use this key to perform a successful mTLS handshake with Skyport cloud gateways.

### 2.2. Cloud Identity Takeover (MAC-Addr Auth)
**Root Cause:** Lack of unique per-device credentials.

The Skyport cloud uses the **MAC Address** as the primary identifier for a thermostat. 
1.  All devices use the **same leaked RSA private key** for TLS encryption.
2.  The identity is asserted in the `LOGIN` packet using the `mac` field.
3.  The first 3 bytes of the MAC are fixed (`00:23:A7`). 
4.  **Impact:** An attacker can potentially iterate through the remaining 3 bytes of the MAC address to impersonate thermostats. Once impersonated, the attacker could receive settings and push changes to the device's cloud configuration.

### 2.3. Potential Input Validation Weakness (`apiAuthUser`)
**Vector:** Local API (`/settings`) or Physical SD Card (`settings.bin`)
**Status:** UNVERIFIED / THEORETICAL

Analysis of the `ImportValidator` function in `stat.mxe` suggests that the `apiAuthUser` parameter might not be sufficiently sanitized before being used in system configuration tasks. It is hypothesized that specially crafted strings could lead to unintended command execution during a service restart. **This vulnerability has not been proven or demonstrated on physical hardware.**

### 2.4. Physical Backdoors (SD Card)
**Vector:** SD Card

The firmware contains logic to check for a file named `keyfile` on an SD card at boot:
*   **Screen Unlock:** File named `keyfile` with Base64 content `CTOUCH...` triggers a screen unlock.
*   **Master PIN Reset:** File named `keyfile` with `CTOUCHKC[PIN]` resets the device master PIN.

### 2.5. Cloud-Initiated Administrative Features
**Root Cause:** Over-privileged remote administration capabilities.

The cloud protocol implements several commands that allow for deep remote control:
1.  **Forced Remote Update (Command 48):** The cloud can request the device to download a new filesystem from a specified URL. 
2.  **Security Feature Override (Command 93):** The cloud can remotely change the device's 4-digit PIN (`ui_passCode`) and the Local API credentials (`apiAuthUser/Password`). 
3.  **Data Access:** While WiFi credentials are not directly readable via standard `READ` commands, the extensive control provided by the protocol represents a significant administrative footprint.

## 3. Firmware Structure & Analysis Tools

### 3.1. Firmware Versions Analyzed
*   **VC:** Platform `1a`, Identity `VH` (Model T7850/T7900). JFFS2 Offset: `9847561`.
*   **VW:** Platform `1a`, Identity `VW` (Commercial). JFFS2 Offset: `9847561`.
*   **VR:** Platform `1`, Identity `VR` (Model T5800). JFFS2 Offset: `1359192`. Contains leaked key.

### 3.2. Universal Unpacker
A script `universal_unpack.py` has been created to automatically detect the JFFS2 partition start offset and unpack the firmware using `jefferson`.

## 4. Remediation Recommendations
1.  **Revoke Leaked Certificate:** The `CT1_LEGACY_DEVICE` certificate should be revoked.
2.  **Per-Device Keys:** Implement unique, on-device generated keys or hardware-backed identity (TPM/Secure Element).
3.  **Remove Backdoors:** Disable the SD card `keyfile` checks.
