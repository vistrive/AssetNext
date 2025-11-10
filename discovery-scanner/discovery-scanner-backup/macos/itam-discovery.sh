#!/bin/bash
# ============================================
# ITAM Network Discovery Scanner - macOS
# Bash-based SNMP Discovery Tool
# ============================================

set -e

# Configuration (will be embedded by server)
CONFIG_JSON='__CONFIG_PLACEHOLDER__'

# Parse embedded configuration
if [ "$CONFIG_JSON" != "__CONFIG_PLACEHOLDER__" ]; then
    # Config is embedded - parse it
    JOB_ID=$(echo "$CONFIG_JSON" | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
    TOKEN=$(echo "$CONFIG_JSON" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    SERVER_URL=$(echo "$CONFIG_JSON" | grep -o '"serverUrl":"[^"]*' | cut -d'"' -f4)
else
    # Fallback: try to read from config.json file (for manual testing)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    CONFIG_FILE="$SCRIPT_DIR/config.json"
    
    if [ -f "$CONFIG_FILE" ]; then
        JOB_ID=$(cat "$CONFIG_FILE" | grep -o '"jobId":"[^"]*' | cut -d'"' -f4)
        TOKEN=$(cat "$CONFIG_FILE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        SERVER_URL=$(cat "$CONFIG_FILE" | grep -o '"serverUrl":"[^"]*' | cut -d'"' -f4)
    else
        echo -e "${RED}ERROR: No configuration found!${NC}"
        echo "This script should be downloaded from the ITAM web interface."
        exit 1
    fi
fi

BATCH_SIZE=20
PING_TIMEOUT=1
MAX_PARALLEL=50

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if required tools are installed
check_dependencies() {
    local missing_deps=()
    
    if ! command -v snmpget &> /dev/null; then
        missing_deps+=("net-snmp")
    fi
    
    # jq is optional - we don't actually use it in the script
    # if ! command -v jq &> /dev/null; then
    #     missing_deps+=("jq")
    # fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${YELLOW}WARNING: Missing dependencies: ${missing_deps[*]}${NC}"
        
        # Check if running as sudo
        if [ "$EUID" -eq 0 ]; then
            echo -e "${RED}ERROR: Cannot install dependencies as root!${NC}"
            echo -e "${YELLOW}Please run WITHOUT sudo first to install dependencies:${NC}"
            echo -e "  ${CYAN}bash $0${NC}"
            echo -e "${YELLOW}Then run WITH sudo to perform the scan.${NC}"
            return 1
        fi
        
        echo -e "${YELLOW}Installing via Homebrew...${NC}"
        
        if ! command -v brew &> /dev/null; then
            echo -e "${RED}ERROR: Homebrew is not installed.${NC}"
            echo -e "${YELLOW}Please install Homebrew: https://brew.sh${NC}"
            return 1
        fi
        
        for dep in "${missing_deps[@]}"; do
            echo "Installing $dep..."
            brew install "$dep" || true
        done
    fi
    
    return 0
}

# Get local network ranges with proper CIDR notation
get_network_ranges() {
    # Get all active network interfaces with IP addresses
    ifconfig | grep -A 5 'status: active' | grep -E 'inet ' | grep -v '127.0.0.1' | while read line; do
        # Extract IP and netmask
        local ip=$(echo "$line" | awk '{print $2}')
        local netmask=$(echo "$line" | awk '{print $4}')
        
        if [ -n "$ip" ] && [ -n "$netmask" ]; then
            # Convert hex netmask to CIDR
            local cidr=$(python3 -c "
import socket, struct
mask = int('$netmask', 16)
cidr = bin(mask).count('1')
print(cidr)
" 2>/dev/null)
            
            # Fallback if python not available
            if [ -z "$cidr" ]; then
                # Common netmask to CIDR conversions
                case "$netmask" in
                    0xffffff00) cidr=24 ;;
                    0xffff0000) cidr=16 ;;
                    0xff000000) cidr=8 ;;
                    *) cidr=24 ;;  # Default to /24
                esac
            fi
            
            # Calculate network address
            IFS=. read -r i1 i2 i3 i4 <<< "$ip"
            local ip_dec=$((i1 * 256**3 + i2 * 256**2 + i3 * 256 + i4))
            local mask_dec=$(( ((1 << 32) - 1) & ~((1 << (32 - cidr)) - 1) ))
            local network_dec=$((ip_dec & mask_dec))
            local n1=$(( (network_dec >> 24) & 255 ))
            local n2=$(( (network_dec >> 16) & 255 ))
            local n3=$(( (network_dec >> 8) & 255 ))
            local n4=$(( network_dec & 255 ))
            
            echo "$n1.$n2.$n3.$n4/$cidr"
        fi
    done | sort -u
}

# Test if host is alive
test_host_alive() {
    local ip=$1
    ping -c 1 -W "$PING_TIMEOUT" "$ip" &> /dev/null
    return $?
}

# Scan open ports
scan_ports() {
    local ip=$1
    local ports=(21 22 23 25 80 443 161 162 389 445 3389 8080 8443 9100)
    local open_ports=()
    
    for port in "${ports[@]}"; do
        if timeout 0.5 bash -c "echo >/dev/tcp/$ip/$port" 2>/dev/null; then
            open_ports+=("$port")
        fi
    done
    
    echo "${open_ports[@]}"
}

# Device fingerprinting
get_device_fingerprint() {
    local ports=($1)
    
    for port in "${ports[@]}"; do
        case $port in
            9100) echo "printer"; return ;;
            161)  echo "network-device"; return ;;
            3389) echo "windows-server"; return ;;
            22)   echo "linux-server"; return ;;
            445)  echo "file-server"; return ;;
        esac
    done
    
    if [[ " ${ports[@]} " =~ " 80 " ]] || [[ " ${ports[@]} " =~ " 443 " ]]; then
        echo "web-server"
        return
    fi
    
    echo "unknown-device"
}

# Escape JSON string
json_escape() {
    local string="$1"
    # Escape backslashes, quotes, newlines, tabs, carriage returns
    echo "$string" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr '\n' ' ' | tr '\r' ' ' | tr '\t' ' '
}

# Query SNMP
snmp_get() {
    local ip=$1
    local oid=$2
    local community=${3:-public}
    
    # macOS grep doesn't support -P, use sed instead
    local result=$(snmpget -v2c -c "$community" -t 3 -r 1 "$ip" "$oid" 2>/dev/null | sed -n 's/.*STRING: "\?\([^"]*\)"\?.*/\1/p; s/.*INTEGER: \([0-9]*\).*/\1/p; s/.*OID: \([^ ]*\).*/\1/p')
    echo "$result"
}

# Discover device via SNMP
discover_device() {
    local ip=$1
    local hostname=""
    local sysName=""
    local sysDescr=""
    local sysObjectID=""
    local serialNumber=""
    local manufacturer=""
    local model=""
    local osName=""
    local discoveryMethod="port-fingerprint"
    local status="partial"
    local openPorts=()
    local portFingerprint="unknown"
    
    # Try SNMPv2c with common community strings
    local communities=("public" "private" "itam_public")
    local snmpSuccess=false
    
    for community in "${communities[@]}"; do
        sysDescr=$(snmp_get "$ip" "1.3.6.1.2.1.1.1.0" "$community")
        
        if [ -n "$sysDescr" ]; then
            snmpSuccess=true
            sysName=$(snmp_get "$ip" "1.3.6.1.2.1.1.5.0" "$community")
            sysObjectID=$(snmp_get "$ip" "1.3.6.1.2.1.1.2.0" "$community")
            serialNumber=$(snmp_get "$ip" "1.3.6.1.2.1.47.1.1.1.1.11" "$community")
            manufacturer=$(snmp_get "$ip" "1.3.6.1.2.1.47.1.1.1.1.12" "$community")
            model=$(snmp_get "$ip" "1.3.6.1.2.1.47.1.1.1.1.13" "$community")
            
            # Parse OS from sysDescr
            if [[ "$sysDescr" =~ (Windows|Linux|Cisco|HP|Dell) ]]; then
                osName="${BASH_REMATCH[1]}"
            fi
            
            discoveryMethod="snmpv2c"
            status="discovered"
            break
        fi
    done
    
    # If SNMP failed, do port fingerprinting
    if [ "$snmpSuccess" = false ]; then
        openPorts=($(scan_ports "$ip"))
        portFingerprint=$(get_device_fingerprint "${openPorts[*]}")
        
        # Try to resolve hostname
        hostname=$(dig +short -x "$ip" 2>/dev/null | sed 's/\.$//' || echo "")
    fi
    
    # Escape all string values for JSON
    hostname=$(json_escape "$hostname")
    sysName=$(json_escape "$sysName")
    sysDescr=$(json_escape "$sysDescr")
    sysObjectID=$(json_escape "$sysObjectID")
    serialNumber=$(json_escape "$serialNumber")
    manufacturer=$(json_escape "$manufacturer")
    model=$(json_escape "$model")
    osName=$(json_escape "$osName")
    portFingerprint=$(json_escape "$portFingerprint")
    
    # Build JSON device object (single line for proper array joining)
    local device_json='{"ipAddress":"'$ip'","macAddress":null'
    [ -n "$hostname" ] && device_json+=', "hostname":"'$hostname'"' || device_json+=', "hostname":null'
    [ -n "$sysName" ] && device_json+=', "sysName":"'$sysName'"' || device_json+=', "sysName":null'
    [ -n "$sysDescr" ] && device_json+=', "sysDescr":"'$sysDescr'"' || device_json+=', "sysDescr":null'
    [ -n "$sysObjectID" ] && device_json+=', "sysObjectID":"'$sysObjectID'"' || device_json+=', "sysObjectID":null'
    [ -n "$serialNumber" ] && device_json+=', "serialNumber":"'$serialNumber'"' || device_json+=', "serialNumber":null'
    [ -n "$manufacturer" ] && device_json+=', "manufacturer":"'$manufacturer'"' || device_json+=', "manufacturer":null'
    [ -n "$model" ] && device_json+=', "model":"'$model'"' || device_json+=', "model":null'
    [ -n "$osName" ] && device_json+=', "osName":"'$osName'"' || device_json+=', "osName":null'
    device_json+=', "osVersion":null, "interfaces":[]'
    device_json+=', "discoveryMethod":"'$discoveryMethod'"'
    device_json+=', "status":"'$status'"'
    device_json+=', "openPorts":['$(IFS=,; echo "${openPorts[*]}")']'
    [ -n "$portFingerprint" ] && device_json+=', "portFingerprint":"'$portFingerprint'"' || device_json+=', "portFingerprint":null'
    device_json+=', "rawData":{}}'
    
    echo "$device_json"
}

# Send results to server
send_results() {
    local devices_json=$1
    
    local payload=$(cat <<EOF
{
  "token": "$TOKEN",
  "devices": $devices_json
}
EOF
)
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "$SERVER_URL/api/discovery/jobs/$JOB_ID/results")
    
    echo "$response"
}

# Calculate IP range from CIDR
cidr_to_ip_range() {
    local cidr=$1
    local ip=$(echo "$cidr" | cut -d'/' -f1)
    local mask=$(echo "$cidr" | cut -d'/' -f2)
    
    IFS=. read -r i1 i2 i3 i4 <<< "$ip"
    local ip_dec=$((i1 * 256**3 + i2 * 256**2 + i3 * 256 + i4))
    local mask_dec=$(( ((1 << 32) - 1) & ~((1 << (32 - mask)) - 1) ))
    local network_dec=$((ip_dec & mask_dec))
    local broadcast_dec=$((network_dec | ~mask_dec & ((1 << 32) - 1)))
    
    # Start from network+1, end at broadcast-1
    local start=$((network_dec + 1))
    local end=$((broadcast_dec - 1))
    
    echo "$start $end"
}

# Convert decimal IP to dotted notation
dec_to_ip() {
    local dec=$1
    local ip1=$(( (dec >> 24) & 255 ))
    local ip2=$(( (dec >> 16) & 255 ))
    local ip3=$(( (dec >> 8) & 255 ))
    local ip4=$(( dec & 255 ))
    echo "$ip1.$ip2.$ip3.$ip4"
}

# Main scanning function
scan_network_range() {
    local network=$1
    
    echo -e "${CYAN}Scanning network: $network${NC}"
    
    # Calculate IP range from CIDR
    local range_info=$(cidr_to_ip_range "$network")
    local start_dec=$(echo "$range_info" | cut -d' ' -f1)
    local end_dec=$(echo "$range_info" | cut -d' ' -f2)
    local total_hosts=$((end_dec - start_dec + 1))
    
    echo -e "${CYAN}[1/4] Detecting network...${NC}"
    local first_ip=$(dec_to_ip $start_dec)
    local last_ip=$(dec_to_ip $end_dec)
    echo -e "  Network: $network"
    echo -e "  Range: $first_ip - $last_ip"
    echo -e "  Hosts to scan: $total_hosts"
    echo ""
    
    echo -e "${CYAN}[2/4] Checking dependencies...${NC}"
    if command -v snmpget &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} SNMP tools ready"
    else
        echo -e "  ${YELLOW}⚠${NC} SNMP not available, using port fingerprinting"
    fi
    echo ""
    
    echo -e "${CYAN}[3/4] Scanning for devices...${NC}"
    
    local discovered_devices=()
    local count=0
    local scanned=0
    local temp_file="/tmp/itam_discovery_$$_$(date +%s)"
    
    for ((ip_dec=start_dec; ip_dec<=end_dec; ip_dec++)); do
        local target_ip=$(dec_to_ip $ip_dec)
        
        ((scanned++))
        
        # Progress indicator
        if [ $((scanned % 10)) -eq 0 ]; then
            local progress=$((scanned * 100 / total_hosts))
            echo -ne "  Progress: $scanned/$total_hosts IPs scanned ($progress%)\r"
        fi
        
        # Limit parallel jobs
        while [ $(jobs -r | wc -l) -ge $MAX_PARALLEL ]; do
            sleep 0.1
        done
        
        {
            if test_host_alive "$target_ip"; then
                device=$(discover_device "$target_ip")
                echo "$device" >> "$temp_file"
                echo -e "\n${GREEN}  ✓ Found device: $target_ip${NC}"
            fi
        } &
        
        ((count++))
        
        # Send batch every BATCH_SIZE devices
        if [ $count -ge $BATCH_SIZE ]; then
            wait  # Wait for all background jobs
            
            if [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
                local num_devices=$(wc -l < "$temp_file")
                echo -e "${CYAN}[4/4] Uploading $num_devices device(s)...${NC}"
                # Join JSON objects with commas (macOS-compatible)
                devices_array="[$(awk '{printf "%s%s", (NR>1 ? "," : ""), $0}' "$temp_file")]"
                send_results "$devices_array"
                echo -e "  ${GREEN}✓${NC} Batch uploaded"
                rm "$temp_file"
                count=0
            fi
        fi
    done
    
    # Wait for remaining jobs
    wait
    
    echo -e "\n"
    
    # Send remaining devices
    if [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
        local num_devices=$(wc -l < "$temp_file")
        echo -e "${CYAN}[4/4] Uploading final batch of $num_devices device(s)...${NC}"
        # Join JSON objects with commas (macOS-compatible)
        devices_array="[$(awk '{printf "%s%s", (NR>1 ? "," : ""), $0}' "$temp_file")]"
        send_results "$devices_array"
        echo -e "  ${GREEN}✓${NC} Upload complete"
        rm "$temp_file"
    else
        echo -e "${YELLOW}[4/4] No devices to upload${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Scan Complete!${NC}"
    echo -e "  Total IPs scanned: $scanned"
}

# Main execution
main() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  ITAM Network Discovery Scanner - macOS${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    
    if [ -z "$JOB_ID" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}ERROR: JobId and Token are required!${NC}"
        exit 1
    fi
    
    echo "Job ID: $JOB_ID"
    echo "Server: $SERVER_URL"
    echo ""
    
    # Check dependencies
    check_dependencies || {
        echo -e "${YELLOW}Continuing with limited functionality...${NC}"
    }
    
    # Get network ranges
    ranges=($(get_network_ranges))
    echo "Detected ${#ranges[@]} network range(s)"
    echo ""
    
    # Scan each range
    for range in "${ranges[@]}"; do
        scan_network_range "$range"
    done
    
    echo ""
    echo -e "${CYAN}================================================${NC}"
    echo -e "${GREEN}Discovery completed!${NC}"
    echo "Check the web interface for results"
    echo -e "${CYAN}================================================${NC}"
    
    # Keep terminal open
    echo ""
    read -p "Press Enter to exit..."
}

# Run main function
main
