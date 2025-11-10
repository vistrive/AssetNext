#!/bin/bash
# ============================================
# ITAM Network Discovery Scanner - Linux
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

# Check if running with sufficient privileges
check_privileges() {
    if [ "$EUID" -ne 0 ]; then
        echo -e "${YELLOW}WARNING: Not running as root. Some SNMP operations may fail.${NC}"
        echo -e "${YELLOW}Consider running with: sudo $0${NC}"
    fi
}

# Check dependencies and install if missing
check_dependencies() {
    local missing_deps=()
    
    if ! command -v snmpget &> /dev/null; then
        missing_deps+=("snmp")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi
    
    if ! command -v nmap &> /dev/null; then
        echo -e "${YELLOW}nmap not found. Port scanning will use basic TCP probes.${NC}"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        echo -e "${YELLOW}Missing dependencies: ${missing_deps[*]}${NC}"
        echo -e "${CYAN}Attempting to install...${NC}"
        
        # Detect package manager
        if command -v apt-get &> /dev/null; then
            echo "Using apt-get..."
            sudo apt-get update
            for dep in "${missing_deps[@]}"; do
                sudo apt-get install -y "$dep"
            done
        elif command -v yum &> /dev/null; then
            echo "Using yum..."
            for dep in "${missing_deps[@]}"; do
                sudo yum install -y "$dep"
            done
        elif command -v dnf &> /dev/null; then
            echo "Using dnf..."
            for dep in "${missing_deps[@]}"; do
                sudo dnf install -y "$dep"
            done
        elif command -v pacman &> /dev/null; then
            echo "Using pacman..."
            for dep in "${missing_deps[@]}"; do
                sudo pacman -S --noconfirm "$dep"
            done
        else
            echo -e "${RED}ERROR: No supported package manager found.${NC}"
            echo "Please install manually: ${missing_deps[*]}"
            return 1
        fi
    fi
    
    return 0
}

# Get local network ranges with proper CIDR notation
get_network_ranges() {
    # Get all IPv4 addresses with CIDR from active interfaces
    ip -4 addr show | grep -E 'inet .* (brd|peer)' | grep -v '127.0.0.1' | while read line; do
        # Extract IP and netmask
        local cidr=$(echo "$line" | grep -oP 'inet\s+\K[\d.]+/\d+')
        if [ -n "$cidr" ]; then
            # Calculate network address from IP/CIDR
            local ip=$(echo "$cidr" | cut -d'/' -f1)
            local mask=$(echo "$cidr" | cut -d'/' -f2)
            
            # Convert IP to network address
            IFS=. read -r i1 i2 i3 i4 <<< "$ip"
            local ip_dec=$((i1 * 256**3 + i2 * 256**2 + i3 * 256 + i4))
            local mask_dec=$(( ((1 << 32) - 1) & ~((1 << (32 - mask)) - 1) ))
            local network_dec=$((ip_dec & mask_dec))
            local n1=$(( (network_dec >> 24) & 255 ))
            local n2=$(( (network_dec >> 16) & 255 ))
            local n3=$(( (network_dec >> 8) & 255 ))
            local n4=$(( network_dec & 255 ))
            
            echo "$n1.$n2.$n3.$n4/$mask"
        fi
    done | sort -u
}

# Test if host is alive
test_host_alive() {
    local ip=$1
    ping -c 1 -W "$PING_TIMEOUT" "$ip" &> /dev/null
    return $?
}

# Scan open ports using nmap or netcat
scan_ports() {
    local ip=$1
    local ports=(21 22 23 25 80 443 161 162 389 445 3389 8080 8443 9100)
    local open_ports=()
    
    if command -v nmap &> /dev/null; then
        # Use nmap for faster scanning
        local nmap_output=$(nmap -p$(IFS=,; echo "${ports[*]}") --open -T4 "$ip" 2>/dev/null | grep '^[0-9]' | cut -d'/' -f1)
        for port in $nmap_output; do
            open_ports+=("$port")
        done
    else
        # Fallback to TCP probes
        for port in "${ports[@]}"; do
            if timeout 0.5 bash -c "echo >/dev/tcp/$ip/$port" 2>/dev/null; then
                open_ports+=("$port")
            fi
        done
    fi
    
    echo "${open_ports[@]}"
}

# Device fingerprinting based on open ports
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

# Get MAC address for an IP
get_mac_address() {
    local ip=$1
    
    # Try arp cache first
    local mac=$(arp -n "$ip" 2>/dev/null | grep -oP '([0-9a-f]{2}:){5}[0-9a-f]{2}')
    
    if [ -z "$mac" ]; then
        # Ping to populate ARP cache
        ping -c 1 -W 1 "$ip" &>/dev/null
        mac=$(arp -n "$ip" 2>/dev/null | grep -oP '([0-9a-f]{2}:){5}[0-9a-f]{2}')
    fi
    
    echo "$mac"
}

# Query SNMP
snmp_get() {
    local ip=$1
    local oid=$2
    local community=${3:-public}
    
    local result=$(snmpget -v2c -c "$community" -t 3 -r 1 "$ip" "$oid" 2>/dev/null | grep -oP '(?<=STRING: ).*|(?<=INTEGER: ).*|(?<=OID: ).*' | sed 's/"//g')
    echo "$result"
}

# Discover device via SNMP
discover_device() {
    local ip=$1
    local macAddress=""
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
    
    # Get MAC address
    macAddress=$(get_mac_address "$ip")
    
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
            if [[ "$sysDescr" =~ (Windows|Linux|Cisco|HP|Dell|Ubuntu|CentOS|RedHat) ]]; then
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
        hostname=$(host "$ip" 2>/dev/null | grep -oP '(?<=pointer ).*' | sed 's/\.$//' || echo "")
        
        if [ -z "$hostname" ]; then
            hostname=$(nslookup "$ip" 2>/dev/null | grep -oP '(?<=name = ).*' | sed 's/\.$//' || echo "")
        fi
    fi
    
    # Escape quotes in JSON strings
    sysDescr=$(echo "$sysDescr" | sed 's/"/\\"/g')
    hostname=$(echo "$hostname" | sed 's/"/\\"/g')
    
    # Build JSON device object
    local device_json=$(cat <<EOF
{
  "ipAddress": "$ip",
  "macAddress": $([ -n "$macAddress" ] && echo "\"$macAddress\"" || echo "null"),
  "hostname": $([ -n "$hostname" ] && echo "\"$hostname\"" || echo "null"),
  "sysName": $([ -n "$sysName" ] && echo "\"$sysName\"" || echo "null"),
  "sysDescr": $([ -n "$sysDescr" ] && echo "\"$sysDescr\"" || echo "null"),
  "sysObjectID": $([ -n "$sysObjectID" ] && echo "\"$sysObjectID\"" || echo "null"),
  "serialNumber": $([ -n "$serialNumber" ] && echo "\"$serialNumber\"" || echo "null"),
  "manufacturer": $([ -n "$manufacturer" ] && echo "\"$manufacturer\"" || echo "null"),
  "model": $([ -n "$model" ] && echo "\"$model\"" || echo "null"),
  "osName": $([ -n "$osName" ] && echo "\"$osName\"" || echo "null"),
  "osVersion": null,
  "interfaces": [],
  "discoveryMethod": "$discoveryMethod",
  "status": "$status",
  "openPorts": [$(IFS=,; echo "${openPorts[*]}")],
  "portFingerprint": "$portFingerprint",
  "rawData": {}
}
EOF
)
    
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
    
    # Start from network+1, end at broadcast-1 (skip network and broadcast addresses)
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
    local snmp_ready="false"
    if command -v snmpget &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} SNMP tools ready"
        snmp_ready="true"
    else
        echo -e "  ${YELLOW}⚠${NC} SNMP not available, will use port fingerprinting"
    fi
    echo ""
    
    echo -e "${CYAN}[3/4] Scanning for devices...${NC}"
    
    local discovered_devices=()
    local count=0
    local scanned=0
    local temp_file="/tmp/itam_discovery_$$_$(date +%s)"
    
    for ((ip_dec=start_dec; ip_dec<=end_dec; ip_dec++)); do
        local target_ip=$(dec_to_ip $ip_dec)
        
        local target_ip=$(dec_to_ip $ip_dec)
        
        ((scanned++))
        
        # Progress indicator
        if [ $((scanned % 10)) -eq 0 ]; then
            local progress=$((scanned * 100 / total_hosts))
            echo -ne "  Progress: $scanned/$total_hosts IPs scanned, $progress% complete\r"
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
            
            echo -e "${CYAN}[4/4] No devices to upload${NC}"
            
            if [ -f "$temp_file" ] && [ -s "$temp_file" ]; then
                local num_devices=$(wc -l < "$temp_file")
                echo -e "${CYAN}[4/4] Uploading $num_devices device(s)...${NC}"
                devices_array="[$(cat "$temp_file" | paste -sd,)]"
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
        devices_array="[$(cat "$temp_file" | paste -sd,)]"
        send_results "$devices_array"
        echo -e "  ${GREEN}✓${NC} Upload complete"
        rm "$temp_file"
    else
        echo -e "${YELLOW}[4/4] No devices to upload${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}Scan Complete!${NC}"
    local devices_found=$(grep -c "Found device" /tmp/itam_scan_log_$$ 2>/dev/null || echo "0")
    echo -e "  Total IPs scanned: $scanned"
    echo -e "  Devices found: $devices_found"
}

# Main execution
main() {
    echo -e "${CYAN}================================================${NC}"
    echo -e "${CYAN}  ITAM Network Discovery Scanner - Linux${NC}"
    echo -e "${CYAN}================================================${NC}"
    echo ""
    
    if [ -z "$JOB_ID" ] || [ -z "$TOKEN" ]; then
        echo -e "${RED}ERROR: JobId and Token are required!${NC}"
        exit 1
    fi
    
    echo "Job ID: $JOB_ID"
    echo "Server: $SERVER_URL"
    echo ""
    
    # Check privileges
    check_privileges
    
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
