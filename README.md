# Venstar ColorTouch Security Research

This repository contains tools and documentation derived from the reverse engineering of Venstar ColorTouch thermostat firmware (VC, VR, and VW series).

## ⚠️ Warning
**This information is for educational and security research purposes only.** Unauthorized access to or manipulation of devices you do not own is illegal and unethical.

## 📄 Documentation
Detailed analysis and findings are located in the `docs/` directory:
*   **[Security Analysis Report](docs/VENSTAR_FIRMWARE_ANALYSIS.md):** Summary of security concerns including physical backdoors and potential authentication weaknesses.
*   **[Skyport Cloud Protocol](docs/CLOUD.md):** Deep-dive into the custom binary protocol used for cloud communication, including mTLS details and Command ID mapping.
*   **[Local API Reference](docs/API.md):** Documentation of the built-in HTTP API and its security mechanisms.

## 🛠️ Research Tools
Helper scripts for firmware analysis are in the `scripts/` directory:
*   `universal_unpack.py`: Automatically detects JFFS2 partitions and unpacks firmware images.
*   `skyport_emulator.py`: A functional emulator that can interact with the Skyport cloud using the shared RSA key.
*   `scanner.py`: Low-level JFFS2 partition scanner.
*   `extract_js.py`: Utility to extract the Duktape JavaScript logic from `.mxe` binary files.

## 🔑 Key Findings
1.  **Shared RSA Private Key:** A single 4096-bit RSA private key appears to be shared across multiple legacy ColorTouch product lines for cloud communication.
2.  **Weak Authentication:** Cloud identity is asserted via MAC address. Combined with the shared key, this may allow for unauthorized device impersonation.
3.  **Theoretical Input Validation Weakness:** A potential vulnerability may exist in the Local API parameter handling. This has not been verified on physical hardware.
4.  **Physical Backdoor:** Logic exists to bypass screen locks and reset PINs via specially crafted files on an SD card.

## 🚀 Getting Started
1.  **Unpack Firmware:**
    ```bash
    python3 scripts/universal_unpack.py update.bin
    ```
2.  **Run Cloud Emulator:**
    ```bash
    # Requires skyport_private.pem from an unpacked VR firmware
    python3 scripts/skyport_emulator.py 0023A7XXXXXX
    ```