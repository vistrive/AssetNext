#!/bin/bash
# ============================================
# Create ITAM Discovery Wizard App Bundle
# This creates a macOS .app with GUI wizard
# ============================================

set -e

# Configuration
APP_NAME="ITAM Discovery"
BUNDLE_ID="com.techcorp.itam-discovery"
VERSION="1.0.0"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
APP_DIR="$BUILD_DIR/${APP_NAME}.app"

# Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$APP_DIR/Contents/MacOS"
mkdir -p "$APP_DIR/Contents/Resources"

# Create Info.plist
cat > "$APP_DIR/Contents/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>wizard</string>
    <key>CFBundleIdentifier</key>
    <string>com.techcorp.itam-discovery</string>
    <key>CFBundleName</key>
    <string>ITAM Discovery</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Create the main wizard executable (AppleScript wrapper)
cat > "$APP_DIR/Contents/MacOS/wizard" << 'EOFWIZARD'
#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../Resources"

# Run the AppleScript GUI
osascript "$RESOURCES_DIR/wizard.scpt"
EOFWIZARD

chmod +x "$APP_DIR/Contents/MacOS/wizard"

# Create the AppleScript wizard
cat > "$APP_DIR/Contents/Resources/wizard.scpt" << 'EOFSCRIPT'
#!/usr/bin/osascript

-- Configuration (will be embedded by server)
property configData : "__CONFIG_PLACEHOLDER__"

-- Parse config
on parseConfig()
    if configData is "__CONFIG_PLACEHOLDER__" then
        display alert "Configuration Error" message "This app was not properly configured. Please download again from the ITAM web interface." as critical
        error number -128
    end if
    return configData
end parseConfig

-- Show welcome screen
on showWelcome()
    set welcomeMessage to "Welcome to ITAM Network Discovery!

This wizard will guide you through scanning your network to discover devices like printers, routers, switches, and other network-connected equipment.

The scan will:
• Detect all devices on your local network
• Collect hardware and software information
• Automatically upload results to your ITAM system

Click Continue to proceed."
    
    display dialog welcomeMessage buttons {"Cancel", "Continue"} default button "Continue" with icon note with title "ITAM Discovery Wizard"
    
    if button returned of result is "Cancel" then
        error number -128
    end if
end showWelcome

-- Check for required tools
on checkDependencies()
    set missingTools to {}
    
    try
        do shell script "which snmpget"
    on error
        set end of missingTools to "net-snmp"
    end try
    
    if (count of missingTools) > 0 then
        set toolsList to my joinList(missingTools, ", ")
        set installMessage to "Required tools are missing: " & toolsList & "

Do you want to install them now using Homebrew?

Note: You'll need Homebrew installed (https://brew.sh) and may be prompted for your password."
        
        display dialog installMessage buttons {"Cancel", "Install"} default button "Install" with icon caution with title "Missing Dependencies"
        
        if button returned of result is "Install" then
            try
                set installCmd to "
if ! command -v brew &> /dev/null; then
    echo 'ERROR: Homebrew not installed'
    exit 1
fi

"
                repeat with tool in missingTools
                    set installCmd to installCmd & "brew install " & tool & " || true
"
                end repeat
                
                tell application "Terminal"
                    activate
                    do script installCmd
                end tell
                
                display dialog "Dependencies are being installed in Terminal. Please wait for installation to complete, then run this wizard again." buttons {"OK"} default button "OK" with icon note
                error number -128
            on error errMsg
                display alert "Installation Failed" message errMsg as critical
                error number -128
            end try
        else
            error number -128
        end if
    end if
end checkDependencies

-- Show scan options
on showScanOptions()
    set optionsMessage to "Scan Configuration

The scanner will automatically detect your network range and scan all devices.

Scan will include:
✓ Network device discovery (SNMP)
✓ Hardware information collection
✓ Operating system detection
✓ Network port scanning

This process typically takes 2-10 minutes depending on your network size.

Ready to start?"
    
    display dialog optionsMessage buttons {"Cancel", "Start Scan"} default button "Start Scan" with icon note with title "Configure Scan"
    
    if button returned of result is "Cancel" then
        error number -128
    end if
end showScanOptions

-- Run the actual scan in Terminal
on runScan()
    set resourcesPath to (path to me as text) & "Contents:Resources:"
    set resourcesPosix to POSIX path of resourcesPath
    set scannerScript to resourcesPosix & "itam-discovery.sh"
    
    -- Check if scanner script exists
    try
        do shell script "test -f " & quoted form of scannerScript
    on error
        display alert "Scanner Not Found" message "The scanner script could not be found. Please download the app again." as critical
        error number -128
    end try
    
    -- Show starting message
    display dialog "The network scan will now start in Terminal.

Please do not close the Terminal window until the scan completes.

You will see progress updates as devices are discovered." buttons {"OK"} default button "OK" with icon note with title "Starting Scan"
    
    -- Launch Terminal with the scanner
    set scanCmd to "clear
echo '================================================'
echo 'ITAM Network Discovery Scanner'
echo '================================================'
echo ''
echo 'Initializing scan...'
echo ''

cd " & quoted form of resourcesPosix & "
sudo bash " & quoted form of scannerScript & "

echo ''
echo '================================================'
echo 'Scan Complete!'
echo '================================================'
echo ''
echo 'Results have been uploaded to your ITAM system.'
echo 'You can close this window now.'
echo ''
read -p 'Press Enter to exit...'
"
    
    tell application "Terminal"
        activate
        do script scanCmd
    end tell
end runScan

-- Utility: Join list items
on joinList(theList, theDelimiter)
    set oldDelimiters to AppleScript's text item delimiters
    set AppleScript's text item delimiters to theDelimiter
    set theString to theList as string
    set AppleScript's text item delimiters to oldDelimiters
    return theString
end joinList

-- Main execution
on run
    try
        my parseConfig()
        my showWelcome()
        my checkDependencies()
        my showScanOptions()
        my runScan()
    on error errMsg number errNum
        if errNum is not -128 then -- -128 is user cancelled
            display alert "Error" message errMsg as critical
        end if
    end try
end run
EOFSCRIPT

chmod +x "$APP_DIR/Contents/Resources/wizard.scpt"

# Copy the actual scanner script to Resources
cp "$SCRIPT_DIR/itam-discovery.sh" "$APP_DIR/Contents/Resources/"
chmod +x "$APP_DIR/Contents/Resources/itam-discovery.sh"

echo "✓ App bundle created at: $APP_DIR"
echo ""
echo "To test: open '$APP_DIR'"
echo ""
echo "To create distributable .zip:"
echo "  cd '$BUILD_DIR' && zip -r 'ITAM-Discovery.zip' '${APP_NAME}.app'"
