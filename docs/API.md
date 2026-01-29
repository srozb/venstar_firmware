# Venstar Thermostat Local API Documentation

## 1. HTTP API Endpoints

| Endpoint | Method | Input | Description | Implementation |
| :--- | :--- | :--- | :--- | :--- |
| `/` | GET | N/A | Basic device identification. | Native (`queryRootHandler`) |
| `/query/info` | GET | N/A | Current status (mode, temp, fan). | Native (`queryInfoHandler`) |
| `/query/sensors` | GET | N/A | Data from all sensors. | Native (`querySensorsHandler`) |
| `/query/runtimes` | GET | N/A | Historical usage data. | Native (`queryRuntimeHandler`) |
| `/query/alerts` | GET | N/A | Active system alerts. | Native (`queryAlertsHandler`) |
| `/control` | POST | Form | Set mode, fan, and temps. | Native (`queryContolHandler`) |
| `/settings` | GET | `?q=KEY` | Retrieve system settings. | JS (`querySettings`) |
| `/settings` | POST | JSON | Update system settings. | JS (`updateSettings`) |

## 2. Key Variables (via `/settings`)

| Variable | Type | Category | Max Length | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `apiAuthUser` | String | Security | 64 | Local API Username. |
| `apiAuthPassword`| String | Security | 64 | Local API Password. |
| `ui_passCode` | Pin | Security | 4 | Physical screen lock code. |
| `apiEnable` | Bool | Security | 1 | Toggles API access. |
| `apiUseSecure` | Bool | Security | 1 | Toggles HTTPS. |
| `nw_ssid` | String | Network | 32? | WiFi SSID. |
| `nw_key` | String | Network | 64 | WiFi Password. |
| `ui_statName` | String | Config | 14 | Thermostat Name. |

## 3. Technical Internals

### Authentication
*   **Type:** HTTP Digest Authentication.
*   **Storage:** Credentials are stored in `gui.db` (SQLite) and mirrored to `/tmp/.htpasswd`.
*   **Verification:** Handled by the native `maestro2` binary using the Mongoose web server library.

### The JS-Native Bridge
The thermostat logic is primarily written in JavaScript (`stat.mxe`) and executed via an embedded **Duktape** engine. The following native functions are exposed to the JS environment:
*   `System.shell(command)`: Directly executes a shell command via `system()`.
*   `System.executeCommandLine(bin, args)`: Executes a binary via `execve`.
*   `db.exec(sql)`: Executes raw SQL on the configuration database.
*   `new File(path)`: Provides read/write access to the local filesystem.

### Security Mechanisms
*   **Blacklist:** `ImportValidator.isStringClean` blocks the following characters: `;`, `'`, `"`, and `=`.
*   **Export Restrictions:** Variables marked as `NOEXPORT` in `settings.json` cannot be retrieved or updated via the API.
