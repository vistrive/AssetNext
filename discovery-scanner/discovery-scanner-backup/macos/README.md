# macOS SNMP Discovery Scanner

## Overview
This bash-based scanner discovers network devices using SNMP and port fingerprinting on macOS.

## Building the .app Bundle

### Method 1: Using Platypus (Recommended)
```bash
# Install Platypus
brew install --cask platypus

# Create app using Platypus GUI:
1. Open Platypus
2. Select "Shell Script" type
3. Set Script Path: itam-discovery.sh
4. App Name: "ITAM Discovery"
5. Interface: "None" (runs in Terminal)
6. Check "Run with Administrator Privileges"
7. Add icon (optional)
8. Click "Create App"
```

### Method 2: Manual .app Creation
```bash
# Create app structure
mkdir -p "ITAM Discovery.app/Contents/MacOS"
mkdir -p "ITAM Discovery.app/Contents/Resources"

# Copy script
cp itam-discovery.sh "ITAM Discovery.app/Contents/MacOS/ITAM Discovery"
chmod +x "ITAM Discovery.app/Contents/MacOS/ITAM Discovery"

# Create Info.plist
cat > "ITAM Discovery.app/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>ITAM Discovery</string>
    <key>CFBundleIdentifier</key>
    <string>com.itam.discovery</string>
    <key>CFBundleName</key>
    <string>ITAM Discovery</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>
EOF
```

### Method 3: Building a .pkg Installer
```bash
# Install packages tool
brew install packages

# Create package structure
mkdir -p pkg/root/Applications
mv "ITAM Discovery.app" pkg/root/Applications/

# Build pkg
pkgbuild --root pkg/root \
         --identifier com.itam.discovery \
         --version 1.0.0 \
         --install-location / \
         itam-discovery-macos.pkg
```

## Code Signing & Notarization

### Step 1: Get Developer Certificate
```bash
# List certificates
security find-identity -v -p codesigning

# Sign the app
codesign --force --deep --sign "Developer ID Application: Your Name" "ITAM Discovery.app"

# Verify signature
codesign --verify --deep --strict "ITAM Discovery.app"
spctl --assess --type execute --verbose "ITAM Discovery.app"
```

### Step 2: Notarize with Apple
```bash
# Create archive
ditto -c -k --keepParent "ITAM Discovery.app" "ITAM Discovery.zip"

# Submit for notarization
xcrun notarytool submit "ITAM Discovery.zip" \
    --apple-id "your@email.com" \
    --team-id "TEAMID" \
    --password "app-specific-password" \
    --wait

# Staple notarization ticket
xcrun stapler staple "ITAM Discovery.app"

# Verify
xcrun stapler validate "ITAM Discovery.app"
```

## Prerequisites
- Homebrew: https://brew.sh
- Net-SNMP: `brew install net-snmp`
- jq (JSON processor): `brew install jq`

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
1. Double-click `ITAM Discovery.app`
2. Grant necessary permissions (network access, administrator)
3. The scanner will automatically run in Terminal
4. Results will be sent to the server in real-time

## Features
- **Auto-discovery**: Detects local network ranges automatically
- **SNMPv2c scanning**: Tries common community strings
- **Port fingerprinting**: Identifies devices by open ports
- **Multi-threaded**: Parallel scanning for performance
- **Batch uploads**: Sends results efficiently
- **Device classification**: Identifies device types

## Troubleshooting

### "Cannot be opened because it is from an unidentified developer"
```bash
# Allow the app
xattr -cr "ITAM Discovery.app"
# Or
sudo spctl --master-disable  # Disable Gatekeeper (not recommended)
```

### SNMP Not Working
```bash
# Install net-snmp
brew install net-snmp

# Test SNMP
snmpget -v2c -c public <target_ip> 1.3.6.1.2.1.1.1.0
```

### Permission Denied
```bash
# Make script executable
chmod +x itam-discovery.sh

# Run with sudo if needed
sudo ./itam-discovery.sh
```

## Creating a DMG Installer
```bash
# Create DMG
hdiutil create -volname "ITAM Discovery" \
               -srcfolder "ITAM Discovery.app" \
               -ov -format UDZO \
               itam-discovery-macos.dmg
```

## Security Notes
- The app requires network access to scan local subnet
- Admin privileges may be needed for SNMP operations
- Token is short-lived (30 minutes) and tenant-scoped
- No sensitive credentials are stored locally
