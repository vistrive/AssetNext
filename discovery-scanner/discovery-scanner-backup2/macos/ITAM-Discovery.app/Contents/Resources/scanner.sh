#!/bin/bash

# ITAM Network Discovery Scanner
# Runs with visual progress dialog

# Configuration will be embedded here by the server
CONFIG_JSON='__CONFIG_PLACEHOLDER__'

# Parse configuration
JOB_ID=$(echo "$CONFIG_JSON" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
TOKEN=$(echo "$CONFIG_JSON" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
SERVER_URL=$(echo "$CONFIG_JSON" | grep -o '"serverUrl":"[^"]*"' | cut -d'"' -f4)

# Log file for debugging
LOG_FILE="$HOME/Library/Logs/itam-discovery-$JOB_ID.log"

echo "ITAM Discovery Started: $(date)" > "$LOG_FILE"
echo "Job ID: $JOB_ID" >> "$LOG_FILE"
echo "Server: $SERVER_URL" >> "$LOG_FILE"

# Function to show progress dialog
show_progress() {
    local message="$1"
    osascript <<EOF
tell application "System Events"
    display dialog "$message" with title "ITAM Network Discovery" buttons {"Cancel"} default button 1 giving up after 2 with icon note
end tell
EOF
}

# Function to update job progress on server
update_progress() {
    local status="$1"
    local message="$2"
    local progress="$3"
    curl -s -X PATCH \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "{\"status\":\"$status\",\"progressMessage\":\"$message\",\"progressPercent\":$progress}" \
        "$SERVER_URL/api/discovery/jobs/$JOB_ID/progress" >> "$LOG_FILE" 2>&1
}

# Show initial dialog
osascript -e 'display dialog "Initializing network scan...\n\nThis will scan your local network for devices using SNMP." with title "ITAM Network Discovery" buttons {"Cancel"} default button 1 giving up after 3 with icon note' &

update_progress "running" "Checking dependencies..." 5

# Check and install dependencies with progress
if ! command -v snmpget &> /dev/null; then
    echo "Installing net-snmp..." >> "$LOG_FILE"
    osascript -e 'display dialog "Installing SNMP tools via Homebrew...\n\nThis may take a moment." with title "ITAM Network Discovery" buttons {"Cancel"} default button 1 giving up after 5 with icon note' &
    if command -v brew &> /dev/null; then
        brew install net-snmp >> "$LOG_FILE" 2>&1
    fi
fi

if ! command -v jq &> /dev/null; then
    echo "Installing jq..." >> "$LOG_FILE"
    if command -v brew &> /dev/null; then
        brew install jq >> "$LOG_FILE" 2>&1
    fi
fi

# Get network range
NETWORK_RANGE=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d'.' -f1-3).0/24
echo "Scanning network: $NETWORK_RANGE" >> "$LOG_FILE"

BASE_IP=$(echo $NETWORK_RANGE | cut -d'/' -f1 | cut -d'.' -f1-3)

update_progress "running" "Scanning network: $NETWORK_RANGE" 10

# Initialize results
DEVICES='[]'
DISCOVERED=0
TOTAL_IPS=50

# Show scanning dialog
osascript -e 'display dialog "Scanning network: '"$NETWORK_RANGE"'\n\nDevices found: 0" with title "ITAM Network Discovery" buttons {"Cancel"} default button 1 giving up after 2 with icon note' &

# Scan network with progress updates
for i in $(seq 1 $TOTAL_IPS); do
    IP="$BASE_IP.$i"
    PROGRESS=$((10 + (i * 80 / TOTAL_IPS)))
    
    # Update progress every 10 IPs
    if [ $((i % 10)) -eq 0 ]; then
        update_progress "running" "Scanning $IP... (Found: $DISCOVERED devices)" $PROGRESS
        osascript -e 'display dialog "Scanning: '"$IP"'\n\nDevices found: '"$DISCOVERED"'" with title "ITAM Network Discovery - '"$i"'/'"$TOTAL_IPS"'" buttons {"Cancel"} default button 1 giving up after 1 with icon note' &
    fi
    
    # Quick ping test (1 second timeout)
    if ping -c 1 -W 1 $IP &>/dev/null; then
        echo "Found host: $IP - Testing SNMP..." >> "$LOG_FILE"
        
        # Try SNMP
        HOSTNAME=""
        SYS_DESCR=""
        
        for COMMUNITY in public private; do
            HOSTNAME=$(snmpget -v2c -c $COMMUNITY -t 1 -r 0 $IP 1.3.6.1.2.1.1.5.0 2>/dev/null | awk '{print $NF}' | tr -d '"')
            if [ ! -z "$HOSTNAME" ]; then
                SYS_DESCR=$(snmpget -v2c -c $COMMUNITY -t 1 -r 0 $IP 1.3.6.1.2.1.1.1.0 2>/dev/null | cut -d'=' -f2 | tr -d '"')
                
                # Get MAC address from ARP
                MAC_ADDRESS=$(arp -n $IP | awk '{print $4}' | tail -1)
                
                # Create device object
                DEVICE=$(cat <<EOF
{
  "ipAddress": "$IP",
  "hostname": "$HOSTNAME",
  "sysDescr": "$SYS_DESCR",
  "macAddress": "$MAC_ADDRESS",
  "discoveryMethod": "snmpv2c",
  "status": "discovered",
  "scanTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
                DEVICES=$(echo "$DEVICES" | jq ". += [$DEVICE]")
                DISCOVERED=$((DISCOVERED + 1))
                echo "Discovered: $HOSTNAME ($IP)" >> "$LOG_FILE"
                
                # Show discovery notification
                osascript -e 'display dialog "✓ Found device!\n\n'"$HOSTNAME"' ('"$IP"')\n\nTotal: '"$DISCOVERED"' devices" with title "ITAM Network Discovery" buttons {"OK"} default button 1 giving up after 2 with icon note' &
                break
            fi
        done
    fi
done

update_progress "running" "Scan complete. Found $DISCOVERED devices" 90

echo "Scan complete. Found $DISCOVERED devices" >> "$LOG_FILE"

# Show completion dialog
osascript -e 'display dialog "Scan Complete!\n\nFound '"$DISCOVERED"' devices\n\nUploading results to server..." with title "ITAM Network Discovery" buttons {"OK"} default button 1 giving up after 3 with icon note' &

# Upload results
if [ $DISCOVERED -gt 0 ]; then
    echo "Uploading results..." >> "$LOG_FILE"
    
    PAYLOAD=$(cat <<EOF
{
  "devices": $DEVICES
}
EOF
)
    
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d "$PAYLOAD" \
        "$SERVER_URL/api/discovery/jobs/$JOB_ID/results")
    
    echo "Upload response: $RESPONSE" >> "$LOG_FILE"
    
    if echo "$RESPONSE" | grep -q "success"; then
        update_progress "completed" "Successfully discovered $DISCOVERED devices" 100
        # Success dialog
        osascript -e 'display dialog "✓ Upload Complete!\n\nSuccessfully uploaded '"$DISCOVERED"' devices\n\nCheck your ITAM dashboard to review and import them." with title "ITAM Discovery Complete" buttons {"Open Dashboard"} default button 1 with icon note' &
    else
        update_progress "failed" "Failed to upload results" 100
        # Error dialog
        osascript -e 'display alert "Upload Failed" message "Scan completed but failed to upload results.\n\nCheck logs at:\n'"$LOG_FILE"'" as critical buttons {"OK"} default button 1' &
    fi
else
    update_progress "completed" "No devices found" 100
    echo "No devices found" >> "$LOG_FILE"
    osascript -e 'display dialog "Scan Complete\n\nNo SNMP-enabled devices found on your network.\n\nMake sure devices have SNMP enabled with community string \"public\" or \"private\"." with title "ITAM Network Discovery" buttons {"OK"} default button 1 with icon caution' &
fi

echo "Discovery completed: $(date)" >> "$LOG_FILE"

exit 0
