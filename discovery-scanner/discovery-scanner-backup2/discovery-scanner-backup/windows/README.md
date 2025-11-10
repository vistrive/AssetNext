# Windows SNMP Discovery Scanner

## Overview
This PowerShell-based scanner discovers network devices using SNMP and port fingerprinting.

## Building the Executable

### Method 1: Using ps2exe (Recommended)
```powershell
# Install ps2exe
Install-Module -Name ps2exe

# Convert to EXE
ps2exe -inputFile itam-discovery.ps1 -outputFile itam-discovery-windows.exe -title "ITAM Network Discovery" -version "1.0.0" -copyright "2025" -noConsole -requireAdmin
```

### Method 2: Using IExpress (Built into Windows)
1. Open IExpress Wizard: `iexpress`
2. Choose "Create new Self Extraction Directive file"
3. Select "Extract files and run an installation command"
4. Set Package title: "ITAM Network Discovery Scanner"
5. Add files: `itam-discovery.ps1`, `run-discovery.bat`
6. Set install program: `run-discovery.bat`
7. Choose display options (Hidden)
8. Set output file: `itam-discovery-windows.exe`
9. Click Finish

### Method 3: Using PyInstaller (Python wrapper)
```bash
# Install PyInstaller
pip install pyinstaller

# Create Python wrapper (create itam_wrapper.py)
# Then build:
pyinstaller --onefile --noconsole --name itam-discovery-windows itam_wrapper.py
```

## Prerequisites
- Net-SNMP tools (optional, for full SNMP support)
  - Download: https://sourceforge.net/projects/net-snmp/
  - Or install via Chocolatey: `choco install net-snmp`

## Configuration
The scanner reads configuration from `config.json`:
```json
{
  "jobId": "ABC12345",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "serverUrl": "https://your-server.com"
}
```

## Usage
1. Double-click `itam-discovery-windows.exe`
2. The scanner will automatically:
   - Detect local network ranges
   - Scan for live hosts
   - Attempt SNMP queries
   - Perform port fingerprinting
   - Send results to the server in batches

## Features
- **Auto-discovery**: Automatically detects local network ranges
- **SNMPv2c scanning**: Tries common community strings (public, private, itam_public)
- **Port fingerprinting**: Identifies devices by open ports when SNMP fails
- **Multi-threaded**: Scans up to 50 hosts in parallel
- **Batch uploads**: Sends results in batches of 20 devices
- **Device classification**: Identifies printers, switches, routers, servers

## Troubleshooting

### "Access Denied"
- Run as Administrator
- Right-click → "Run as administrator"

### "Execution Policy Error"
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy Bypass
```

### SNMP Not Working
- Install Net-SNMP tools
- Enable SNMP on target devices
- Check firewall rules (UDP port 161)

## Code Signing (Optional)
For production deployment, sign the executable:
```powershell
# Get code signing certificate
$cert = Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert

# Sign the executable
Set-AuthenticodeSignature -FilePath "itam-discovery-windows.exe" -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
```

## Security Notes
- The token is short-lived (30 minutes)
- Token is tenant-scoped
- SNMP credentials stay on the server
- Only a credential profile ID is referenced
