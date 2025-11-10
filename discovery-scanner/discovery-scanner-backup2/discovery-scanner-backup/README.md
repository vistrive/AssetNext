# Network Discovery Scanner - Build Guide

This directory contains the SNMP-based network discovery scanner implementations for Windows, macOS, and Linux.

## Overview

The Network Discovery scanner automatically:
- Detects local network ranges
- Performs ICMP ping sweeps to find live hosts
- Attempts SNMPv2c queries (communities: public, private, itam_public)
- Falls back to port scanning + fingerprinting for non-SNMP devices
- Detects MAC addresses where possible
- Batches and uploads device data to the AssetNext server
- Provides real-time progress updates

## Architecture

```
User clicks "Start Network Discovery" in AssetNext UI
↓
Frontend creates discovery job via POST /api/discovery/jobs
↓
Backend generates unique jobId + 30-minute JWT token
↓
Frontend auto-downloads OS-specific scanner package
↓
User double-clicks downloaded package (no terminal needed)
↓
Scanner reads embedded config.json (jobId, token, serverUrl)
↓
Scanner performs network scan:
  1. Detect network ranges (e.g., 192.168.1.0/24)
  2. ICMP ping sweep to find live hosts
  3. For each host:
     - Try SNMPv2c queries (sysDescr, sysName, serialNumber, etc.)
     - If SNMP fails, scan common ports (22, 80, 443, 3389, etc.)
     - Use port patterns to fingerprint device type
     - Detect MAC address from ARP cache
  4. Batch devices (20 per upload)
  5. POST to /api/discovery/jobs/:jobId/results with JWT auth
↓
Backend processes results:
  - Validates JWT token
  - Checks deduplication (serial → MAC → IP)
  - Stores in discoveredDevices table
  - Updates job statistics
↓
Frontend SSE stream displays live progress
↓
User reviews discovered devices in modal:
  - Sees device details (name, IP, MAC, type, manufacturer)
  - Deduplication warnings for existing assets
  - Assigns site/tags to new devices
  - Selects which devices to import
↓
POST /api/discovery/import creates assets from selected devices
```

## Directory Structure

```
discovery-scanner/
├── README.md (this file)
├── windows/
│   ├── itam-discovery.ps1       # PowerShell scanner script
│   ├── run-discovery.bat        # Batch launcher
│   └── README.md                # Windows build instructions
├── macos/
│   ├── itam-discovery.sh        # Bash scanner script
│   └── README.md                # macOS build instructions
└── linux/
    ├── itam-discovery.sh        # Bash scanner script
    └── README.md                # Linux build instructions
```

## Build Process

### Prerequisites

**All Platforms:**
- Net-SNMP tools (`snmpget` command)
- JSON parsing utilities (`jq` for Unix, native PowerShell for Windows)

**Platform-Specific:**
- **Windows**: ps2exe (PowerShell to EXE converter) or IExpress
- **macOS**: Platypus, Xcode Command Line Tools, Apple Developer ID for signing
- **Linux**: appimagetool, dpkg-deb, or rpmbuild

### Quick Start

1. **Windows**: Follow `windows/README.md` → recommended method: ps2exe
   ```powershell
   cd windows
   Install-Module -Name ps2exe
   ps2exe .\itam-discovery.ps1 .\itam-discovery-windows.exe -noConsole -title "ITAM Discovery" -version "1.0.0.0"
   ```

2. **macOS**: Follow `macos/README.md` → recommended method: Platypus
   ```bash
   cd macos
   # Use Platypus GUI to create .app bundle
   # Then create .pkg installer with pkgbuild
   # Sign with codesign and notarize with notarytool
   ```

3. **Linux**: Follow `linux/README.md` → recommended method: AppImage
   ```bash
   cd linux
   # Create AppDir structure, add AppRun launcher
   # Use appimagetool to generate .AppImage
   # For DEB: use dpkg-deb --build
   ```

### Output Location

Built packages should be placed in:
```
/Users/vishvak/AssetNext/static/discovery/
├── itam-discovery-windows.exe
├── itam-discovery-macos.pkg
└── itam-discovery-linux.AppImage
```

The backend download endpoint serves these files:
```
GET /api/discovery/download/:jobId/:osType
→ Returns static/discovery/itam-discovery-{osType}.{ext}
```

## Configuration

Each scanner package expects a `config.json` file embedded or adjacent to the executable:

```json
{
  "jobId": "ABC12345",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "https://your-assetnext-instance.com"
}
```

**Current Implementation:** Config file must be manually created next to the executable.

**Future Enhancement:** Download endpoint should dynamically inject config into the package so each download is pre-configured with the correct jobId/token.

## Security

- **Token Expiry**: JWT tokens expire after 30 minutes
- **Tenant Isolation**: Tokens include `tenantId` claim, backend validates all operations
- **HTTPS Only**: Scanner uploads use HTTPS POST
- **Credential Storage**: SNMP credentials stored encrypted in `credentialProfiles` table
- **Code Signing**: macOS packages must be signed and notarized; Windows .exe should be Authenticode signed

## Network Scanning Details

### SNMP Queries

**Attempted OIDs (in order):**
1. `1.3.6.1.2.1.1.1.0` - sysDescr (system description)
2. `1.3.6.1.2.1.1.5.0` - sysName (hostname)
3. `1.3.6.1.2.1.43.5.1.1.16.1` - hrDeviceDescr (device type)
4. `1.3.6.1.2.1.43.5.1.1.17.1` - serialNumber
5. `1.3.6.1.2.1.1.2.0` - sysObjectID (vendor OID)
6. `1.3.6.1.2.1.1.6.0` - sysLocation

**Fallback Community Strings:**
- `public` (default)
- `private`
- `itam_public` (custom)

### Port Scanning

**Scanned Ports (for fingerprinting):**
- 21 (FTP) - Network storage, routers
- 22 (SSH) - Linux servers, network devices
- 23 (Telnet) - Legacy routers, switches
- 25 (SMTP) - Email servers
- 80 (HTTP) - Web servers, IoT devices
- 443 (HTTPS) - Secure web services
- 161/162 (SNMP) - Network devices
- 389 (LDAP) - Directory servers
- 445 (SMB) - Windows file sharing
- 3389 (RDP) - Windows servers
- 8080/8443 (HTTP alt) - Application servers
- 9100 (JetDirect) - Network printers

### Deduplication Logic

**Backend checks (in priority order):**
1. **Serial Number**: Exact match in `assets.serialNumber`
2. **MAC Address**: JSON search in `assets.specifications` for `macAddress` field
3. **IP Address**: JSON search in `assets.specifications` for `ipAddress` field

Duplicates are flagged with:
- `isDuplicate: true`
- `duplicateAssetId: <existing asset ID>`
- `duplicateMatchField: "serial" | "mac" | "ip"`

## Testing

### Manual Testing

1. Create a test discovery job:
   ```bash
   curl -X POST https://your-instance.com/api/discovery/jobs \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json"
   ```

2. Note the returned `jobId` and `token`

3. Create `config.json`:
   ```json
   {
     "jobId": "TEST1234",
     "token": "eyJhbGc...",
     "serverUrl": "https://your-instance.com"
   }
   ```

4. Run scanner:
   - **Windows**: `itam-discovery.exe` (or `powershell -ExecutionPolicy Bypass -File .\itam-discovery.ps1`)
   - **macOS/Linux**: `./itam-discovery.sh`

5. Watch SSE stream:
   ```javascript
   const eventSource = new EventSource('/api/discovery/jobs/TEST1234/stream');
   eventSource.onmessage = (event) => {
     console.log(JSON.parse(event.data));
   };
   ```

6. Check results:
   ```bash
   curl https://your-instance.com/api/discovery/jobs/TEST1234 \
     -H "Authorization: Bearer YOUR_JWT"
   ```

### Troubleshooting

**"Access Denied" errors:**
- Windows: Run as Administrator
- macOS/Linux: Run with `sudo` for ICMP ping and ARP access

**SNMP queries fail:**
- Verify `snmpget` is in PATH
- Test manually: `snmpget -v2c -c public <ip> 1.3.6.1.2.1.1.1.0`
- Check firewall rules (UDP port 161)

**No devices found:**
- Verify network connectivity
- Check if target devices have SNMP enabled
- Try manual ping: `ping <target-ip>`

**Upload fails (401 Unauthorized):**
- Token may have expired (30-minute limit)
- Check `serverUrl` is correct
- Verify JWT token is valid

**macOS: "App can't be opened because it is from an unidentified developer":**
- Right-click → Open (first time)
- Or remove quarantine: `xattr -d com.apple.quarantine itam-discovery.app`

## API Endpoints Used by Scanner

**POST /api/discovery/jobs/:jobId/results**
```json
{
  "devices": [
    {
      "ip": "192.168.1.10",
      "mac": "00:11:22:33:44:55",
      "hostname": "printer-floor2",
      "manufacturer": "HP",
      "model": "LaserJet Pro M404dn",
      "serialNumber": "VNC4D56789",
      "deviceType": "Printer",
      "osInfo": "HP JetDirect",
      "snmpData": { "sysDescr": "HP ETHERNET MULTI-ENVIRONMENT" },
      "openPorts": [80, 443, 9100],
      "scanTimestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 20,
  "duplicates": 2
}
```

## Future Enhancements

- [ ] Dynamic config injection in download endpoint
- [ ] SNMPv3 support (SHA/AES authentication)
- [ ] Scheduled discovery jobs (cron-like)
- [ ] Discovery scope limiting (specific subnets, IP ranges)
- [ ] Credential profile selection in UI
- [ ] WMI queries for Windows devices
- [ ] SSH-based Linux device info gathering
- [ ] Auto-retry failed scans
- [ ] Discovery agent (persistent service vs one-time scan)
- [ ] Network topology visualization

## Contributing

When updating scanner logic:
1. Maintain parity across all three OS versions
2. Test on actual target environment (not just dev machine)
3. Update this README with any new configuration options
4. Ensure batch upload logic handles network interruptions
5. Add appropriate error logging

## License

Same license as AssetNext main application (see root LICENSE file).

## Support

For issues or questions:
- Check OS-specific README in `windows/`, `macos/`, or `linux/` directories
- Review backend logs: `server/routes.ts` (search for "discovery")
- Enable verbose logging in scanner scripts (uncomment debug statements)
- Check database: `select * from "discoveryJobs" where "jobId" = 'YOUR_JOB_ID'`
