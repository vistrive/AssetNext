#!/bin/bash
# ============================================
# ITAM Discovery Wizard Launcher
# Shows GUI wizard, then runs scanner in Terminal
# ============================================

# Configuration (will be embedded by server)
CONFIG_JSON='__CONFIG_PLACEHOLDER__'

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to show dialog using osascript
show_dialog() {
    local title="$1"
    local message="$2"
    local buttons="$3"
    local icon="$4"
    
    if [ -z "$buttons" ]; then
        buttons='{"OK"}'
    fi
    
    if [ -z "$icon" ]; then
        icon="note"
    fi
    
    osascript -e "display dialog \"$message\" buttons $buttons default button 1 with icon $icon with title \"$title\"" 2>/dev/null
    return $?
}

# Function to show alert
show_alert() {
    local title="$1"
    local message="$2"
    local type="$3"
    
    if [ -z "$type" ]; then
        type="informational"
    fi
    
    osascript -e "display alert \"$title\" message \"$message\" as $type" 2>/dev/null
    return $?
}

# Welcome screen
show_welcome() {
    show_dialog "ITAM Network Discovery" \
"Welcome to ITAM Network Discovery!

This wizard will help you scan your network to discover devices like printers, routers, switches, and other equipment.

The process will:
• Automatically detect your network range
• Scan for network devices using SNMP
• Collect hardware and software information
• Upload results to your ITAM system

Click OK to continue." \
'{"Cancel", "Continue"}' \
"note"
    
    if [ $? -ne 0 ]; then
        exit 0
    fi
}

# Check dependencies
check_and_install_deps() {
    local missing_deps=()
    
    if ! command -v snmpget &> /dev/null; then
        missing_deps+=("net-snmp")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        show_dialog "Missing Dependencies" \
"Required tools need to be installed: ${missing_deps[*]}

This requires Homebrew package manager.

Click Install to proceed (you may be prompted for your password)." \
'{"Cancel", "Install"}' \
"caution"
        
        if [ $? -ne 0 ]; then
            exit 0
        fi
        
        # Check for Homebrew
        if ! command -v brew &> /dev/null; then
            show_alert "Homebrew Not Found" \
"Homebrew package manager is not installed.

Please install Homebrew from https://brew.sh first, then run this wizard again." \
"warning"
            exit 1
        fi
        
        # Install in Terminal
        osascript -e 'tell application "Terminal"
            activate
            do script "echo \"Installing dependencies...\"; brew install net-snmp && echo \"\" && echo \"Installation complete! Please run the wizard again.\" && read -p \"Press Enter to close...\""
        end tell' &>/dev/null
        
        show_alert "Installing..." \
"Dependencies are being installed in Terminal.

Please wait for installation to complete, then run this wizard again." \
"informational"
        exit 0
    fi
}

# Scan configuration
show_scan_options() {
    show_dialog "Ready to Scan" \
"Scan Configuration:

The scanner will automatically:
✓ Detect your local network range
✓ Discover network devices via SNMP
✓ Collect device information
✓ Upload results to ITAM system

This typically takes 2-10 minutes depending on your network size.

Click Start to begin the scan." \
'{"Cancel", "Start Scan"}' \
"note"
    
    if [ $? -ne 0 ]; then
        exit 0
    fi
}

# Launch scanner in Terminal
launch_scanner() {
    # Find the actual scanner script
    SCANNER_SCRIPT="$SCRIPT_DIR/itam-discovery-embedded.sh"
    
    # If running as standalone .command file, extract the embedded scanner
    if [ ! -f "$SCANNER_SCRIPT" ]; then
        # Extract embedded scanner from this file (after marker)
        SCANNER_SCRIPT="/tmp/itam-discovery-$$.sh"
        sed -n '/^#__SCANNER_START__$/,/^#__SCANNER_END__$/p' "$0" | grep -v "^#__SCANNER" > "$SCANNER_SCRIPT"
        chmod +x "$SCANNER_SCRIPT"
    fi
    
    # Create Terminal command
    TERMINAL_CMD="clear
echo '================================================'
echo '        ITAM Network Discovery Scanner         '
echo '================================================'
echo ''
echo 'Initializing network scan...'
echo ''
echo 'Please wait while we discover devices on your network.'
echo 'This window will update with progress...'
echo ''
echo '================================================'
echo ''

sudo bash '$SCANNER_SCRIPT'

echo ''
echo '================================================'
echo '              Scan Complete!                    '
echo '================================================'
echo ''
echo 'Results have been uploaded to your ITAM system.'
echo 'Check your ITAM dashboard to review discovered devices.'
echo ''
read -p 'Press Enter to close this window...'
"
    
    # Launch Terminal
    osascript -e 'tell application "Terminal"
        activate
        do script "'"$TERMINAL_CMD"'"
    end tell' &>/dev/null
    
    # Show completion message
    show_alert "Scanner Started" \
"The network scan has started in Terminal.

Please do not close the Terminal window until the scan completes.

You will see progress updates as devices are discovered." \
"informational"
}

# Main execution
main() {
    show_welcome
    check_and_install_deps
    show_scan_options
    launch_scanner
}

main

# Exit (scanner continues in Terminal)
exit 0

#__SCANNER_START__
# The actual scanner script will be embedded here by the server
#__SCANNER_END__
