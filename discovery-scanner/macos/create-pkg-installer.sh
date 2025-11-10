#!/bin/bash
# ============================================
# Create macOS .pkg Installer with GUI Wizard
# ============================================

set -e

# Check if running with config parameters
if [ "$#" -lt 3 ]; then
    echo "Usage: $0 <job_id> <token> <server_url> [output_dir]"
    echo "Example: $0 ABC123 eyJhbGc... http://localhost:5050 /tmp"
    exit 1
fi

JOB_ID="$1"
TOKEN="$2"
SERVER_URL="$3"
OUTPUT_DIR="${4:-/tmp}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_ROOT="$OUTPUT_DIR/itam-pkg-root-$$"
PKG_SCRIPTS="$OUTPUT_DIR/itam-pkg-scripts-$$"
RESOURCES_DIR="$OUTPUT_DIR/itam-pkg-resources-$$"

# Clean up old builds
rm -rf "$PKG_ROOT" "$PKG_SCRIPTS" "$RESOURCES_DIR"
mkdir -p "$PKG_ROOT/usr/local/bin"
mkdir -p "$PKG_ROOT/usr/local/share/itam-discovery"
mkdir -p "$PKG_SCRIPTS"
mkdir -p "$RESOURCES_DIR"

echo "Building ITAM Discovery Scanner Installer..."
echo "Job ID: $JOB_ID"

# Create config file
cat > "$PKG_ROOT/usr/local/share/itam-discovery/config.json" << EOF
{
  "jobId": "$JOB_ID",
  "token": "$TOKEN",
  "serverUrl": "$SERVER_URL"
}
EOF

# Copy scanner script
cp "$SCRIPT_DIR/itam-discovery.sh" "$PKG_ROOT/usr/local/share/itam-discovery/scanner.sh"
chmod +x "$PKG_ROOT/usr/local/share/itam-discovery/scanner.sh"

# Embed config into scanner
sed -i '' "s|'__CONFIG_PLACEHOLDER__'|'{\"jobId\":\"$JOB_ID\",\"token\":\"$TOKEN\",\"serverUrl\":\"$SERVER_URL\"}'|g" \
    "$PKG_ROOT/usr/local/share/itam-discovery/scanner.sh"

# Create launcher script
cat > "$PKG_ROOT/usr/local/bin/itam-discovery" << 'EOFLAUNCH'
#!/bin/bash
# ITAM Discovery Scanner Launcher

INSTALL_DIR="/usr/local/share/itam-discovery"
SCANNER_SCRIPT="$INSTALL_DIR/scanner.sh"

if [ ! -f "$SCANNER_SCRIPT" ]; then
    osascript -e 'display alert "Scanner Not Found" message "The scanner was not properly installed. Please reinstall." as critical' 2>/dev/null
    exit 1
fi

# Launch Terminal with the scanner
osascript -e 'tell application "Terminal"
    activate
    do script "clear && echo \"ITAM Network Discovery Scanner\" && echo \"\" && sudo bash /usr/local/share/itam-discovery/scanner.sh"
end tell' &>/dev/null
EOFLAUNCH

chmod +x "$PKG_ROOT/usr/local/bin/itam-discovery"

# Create postinstall script (runs after installation)
cat > "$PKG_SCRIPTS/postinstall" << 'EOFPOST'
#!/bin/bash

# Function to check dependencies
check_dependencies() {
    if ! command -v snmpget &> /dev/null; then
        return 1
    fi
    return 0
}

# Function to install dependencies
install_dependencies() {
    if command -v brew &> /dev/null; then
        osascript -e 'tell application "Terminal"
            activate
            do script "echo \"Installing required dependency: net-snmp\"; echo \"\"; brew install net-snmp && echo \"\" && echo \"✓ Installation complete!\" && echo \"\" && echo \"Starting ITAM Discovery Scanner...\" && echo \"\" && sudo bash /usr/local/share/itam-discovery/scanner.sh"
        end tell' &>/dev/null
        return 0
    else
        osascript -e 'display alert "Homebrew Not Found" message "Homebrew package manager is required to install dependencies.

Please install Homebrew from https://brew.sh first, then:
1. Open Terminal
2. Run: brew install net-snmp
3. Run: sudo itam-discovery" as warning' &>/dev/null
        return 1
    fi
}

# Function to run scanner
run_scanner() {
    osascript -e 'tell application "Terminal"
        activate
        do script "clear && echo \"================================================\" && echo \"     ITAM Network Discovery Scanner            \" && echo \"================================================\" && echo \"\" && echo \"Starting network scan...\" && echo \"\" && sudo bash /usr/local/share/itam-discovery/scanner.sh"
    end tell' &>/dev/null
}

# Show completion dialog and offer to run scanner
if check_dependencies; then
    # Dependencies OK - offer to run scanner now
    osascript -e 'display dialog "ITAM Discovery Scanner has been installed successfully!

All required dependencies are installed and ready.

Would you like to run the network scan now?" buttons {"Later", "Run Now"} default button "Run Now" with icon note with title "Installation Complete"' &>/dev/null
    
    if [ $? -eq 0 ]; then
        # User clicked "Run Now"
        run_scanner
    else
        # User clicked "Later"
        osascript -e 'display alert "Ready to Scan" message "To run the scanner later:
        
Open Terminal and run:
    sudo itam-discovery

The scanner will discover devices on your network and upload results automatically." as informational' &>/dev/null || true
    fi
else
    # Missing dependencies - offer to install
    osascript -e 'display dialog "ITAM Discovery Scanner has been installed!

Required dependency \"net-snmp\" needs to be installed for SNMP network scanning.

Would you like to install it now using Homebrew?" buttons {"Later", "Install & Run"} default button "Install & Run" with icon caution with title "Installation Complete"' &>/dev/null
    
    if [ $? -eq 0 ]; then
        # User clicked "Install & Run"
        install_dependencies
    else
        # User clicked "Later"
        osascript -e 'display alert "Manual Setup Required" message "To complete setup later:

1. Install Homebrew from https://brew.sh
2. Run: brew install net-snmp
3. Run: sudo itam-discovery

The scanner will then discover devices and upload results automatically." as informational' &>/dev/null || true
    fi
fi

exit 0
EOFPOST

chmod +x "$PKG_SCRIPTS/postinstall"

# Create Welcome.html for installer wizard
cat > "$RESOURCES_DIR/Welcome.html" << 'EOFHTML'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        h1 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #000;
        }
        h2 {
            font-size: 14px;
            font-weight: 600;
            margin-top: 20px;
            margin-bottom: 10px;
            color: #000;
        }
        ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        li {
            margin: 5px 0;
        }
        .highlight {
            background-color: #f0f7ff;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
        }
        code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: Monaco, Courier, monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>Welcome to ITAM Network Discovery Scanner</h1>
    
    <p>This installer will set up the ITAM Network Discovery Scanner on your Mac. The scanner helps you discover and inventory network devices in your organization.</p>
    
    <h2>What will be installed:</h2>
    <ul>
        <li>Network discovery scanner script</li>
        <li>Command-line launcher: <code>itam-discovery</code></li>
        <li>Configuration for automatic device upload</li>
    </ul>
    
    <h2>After installation:</h2>
    <div class="highlight">
        <strong>To run the scanner:</strong>
        <ol>
            <li>Open <strong>Terminal</strong> (Applications → Utilities → Terminal)</li>
            <li>Run: <code>sudo itam-discovery</code></li>
            <li>Enter your Mac password when prompted</li>
        </ol>
    </div>
    
    <h2>System Requirements:</h2>
    <ul>
        <li>macOS 10.13 or later</li>
        <li>Administrator access (for sudo)</li>
        <li>Network connectivity</li>
        <li>Homebrew (for dependency installation)</li>
    </ul>
    
    <p><strong>Note:</strong> The scanner requires <code>net-snmp</code> to discover network devices. If not already installed, you'll be prompted to install it via Homebrew after this installation.</p>
</body>
</html>
EOFHTML

# Create ReadMe.html
cat > "$RESOURCES_DIR/ReadMe.html" << 'EOFREADME'
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
            padding: 20px;
        }
        h1 { font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        h2 { font-size: 14px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; }
        code {
            background-color: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: Monaco, Courier, monospace;
            font-size: 12px;
        }
        .command-box {
            background-color: #2d2d2d;
            color: #f8f8f8;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            font-family: Monaco, Courier, monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <h1>ITAM Network Discovery Scanner - User Guide</h1>
    
    <h2>Running the Scanner</h2>
    <p>After installation, run the scanner from Terminal:</p>
    <div class="command-box">
$ sudo itam-discovery
    </div>
    
    <h2>What the Scanner Does</h2>
    <ul>
        <li>Automatically detects your local network range</li>
        <li>Scans all devices on the network using SNMP</li>
        <li>Collects device information (hostname, IP, system description)</li>
        <li>Uploads discovered devices to your ITAM system</li>
    </ul>
    
    <h2>Scan Duration</h2>
    <p>Typical scan time: 2-10 minutes depending on network size</p>
    
    <h2>Troubleshooting</h2>
    
    <h3>Command not found</h3>
    <p>If you get "command not found", ensure <code>/usr/local/bin</code> is in your PATH:</p>
    <div class="command-box">
$ echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
$ source ~/.zshrc
    </div>
    
    <h3>Missing Dependencies</h3>
    <p>Install net-snmp via Homebrew:</p>
    <div class="command-box">
$ brew install net-snmp
    </div>
    
    <h3>Permission Denied</h3>
    <p>The scanner requires sudo (administrator) access to perform network operations.</p>
    
    <h2>Uninstallation</h2>
    <p>To remove the scanner:</p>
    <div class="command-box">
$ sudo rm /usr/local/bin/itam-discovery
$ sudo rm -rf /usr/local/share/itam-discovery
    </div>
    
    <h2>Support</h2>
    <p>For help, contact your IT administrator or visit the ITAM web interface.</p>
</body>
</html>
EOFREADME

# Build the package
COMPONENT_PKG="$OUTPUT_DIR/ITAMDiscovery-component.pkg"
PRODUCT_PKG="$OUTPUT_DIR/ITAM-Discovery-$JOB_ID.pkg"

echo "Creating component package..."
pkgbuild \
    --root "$PKG_ROOT" \
    --scripts "$PKG_SCRIPTS" \
    --identifier "com.techcorp.itam-discovery" \
    --version "1.0.0" \
    --install-location "/" \
    "$COMPONENT_PKG"

# Create Distribution.xml for productbuild
cat > "$OUTPUT_DIR/Distribution.xml" << 'EOFDIST'
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
    <title>ITAM Network Discovery Scanner</title>
    <organization>com.techcorp</organization>
    <domains enable_localSystem="true"/>
    <options customize="never" require-scripts="false" rootVolumeOnly="true"/>
    
    <welcome file="Welcome.html"/>
    <readme file="ReadMe.html"/>
    
    <pkg-ref id="com.techcorp.itam-discovery"/>
    
    <options customize="never" require-scripts="false"/>
    
    <choices-outline>
        <line choice="default">
            <line choice="com.techcorp.itam-discovery"/>
        </line>
    </choices-outline>
    
    <choice id="default"/>
    
    <choice id="com.techcorp.itam-discovery" visible="false">
        <pkg-ref id="com.techcorp.itam-discovery"/>
    </choice>
    
    <pkg-ref id="com.techcorp.itam-discovery" version="1.0.0" onConclusion="none">ITAMDiscovery-component.pkg</pkg-ref>
</installer-gui-script>
EOFDIST

echo "Creating product package..."
productbuild \
    --distribution "$OUTPUT_DIR/Distribution.xml" \
    --resources "$RESOURCES_DIR" \
    --package-path "$OUTPUT_DIR" \
    "$PRODUCT_PKG"

# Clean up temporary files
rm -rf "$PKG_ROOT" "$PKG_SCRIPTS" "$RESOURCES_DIR" "$COMPONENT_PKG" "$OUTPUT_DIR/Distribution.xml"

echo ""
echo "✓ Installer package created successfully!"
echo "  Location: $PRODUCT_PKG"
echo ""
echo "To test: open '$PRODUCT_PKG'"
