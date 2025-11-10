#!/bin/bash

# ITAM Network Monitor Agent for macOS
# Version: 1.0.0

# Configuration
API_URL="${API_URL:-http://localhost:5050}"
API_KEY="${API_KEY:-}"
AGENT_ID="${AGENT_ID:-$(uuidgen)}"
AGENT_NAME="${AGENT_NAME:-$(hostname)}"
SCAN_INTERVAL="${SCAN_INTERVAL:-60}"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v arp-scan &> /dev/null; then
        log_warning "arp-scan not found. Installing via Homebrew..."
        if command -v brew &> /dev/null; then
            brew install arp-scan
            log_success "arp-scan installed"
        else
            log_error "Homebrew not installed. Install from: https://brew.sh"
            exit 1
        fi
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found. Installing..."
        brew install jq
    fi
    
    log_success "Dependencies ready"
}

scan_network() {
    log_info "Scanning network..."
    
    local arp_output=$(sudo arp-scan -l 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        log_error "arp-scan failed. Need sudo privileges."
        return 1
    fi
    
    local devices='[]'
    while IFS=$'\t' read -r ip mac vendor; do
        if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            local hostname=$(dig +short -x "$ip" 2>/dev/null | sed 's/\.$//')
            [ -z "$hostname" ] && hostname=""
            
            local device=$(cat <<EOF
{
  "ipAddress": "$ip",
  "macAddress": "$(echo $mac | tr '[:upper:]' '[:lower:]')",
  "hostname": "$hostname",
  "manufacturer": "$vendor",
  "lastSeen": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)
            devices=$(echo "$devices" | jq ". += [$device]")
        fi
    done < <(echo "$arp_output" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+')
    
    log_success "Found $(echo "$devices" | jq 'length') devices"
    echo "$devices"
}

send_heartbeat() {
    local network_range=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}' | cut -d'.' -f1-3).0/24
    local agent_ip=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    
    curl -s -X POST "$API_URL/api/network/agent/heartbeat" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "{\"agentId\":\"$AGENT_ID\",\"agentName\":\"$AGENT_NAME\",\"osType\":\"macos\",\"version\":\"1.0.0\",\"agentIpAddress\":\"$agent_ip\",\"networkRange\":\"$network_range\"}" > /dev/null 2>&1
}

send_devices() {
    local devices="$1"
    
    log_info "Sending data to backend..."
    
    local response=$(curl -s -X POST "$API_URL/api/network/presence/update" \
        -H "Content-Type: application/json" \
        -H "X-API-Key: $API_KEY" \
        -d "{\"agentId\":\"$AGENT_ID\",\"devices\":$devices}")
    
    if echo "$response" | jq -e '.success' > /dev/null 2>&1; then
        log_success "Data sent successfully"
    else
        log_error "Failed to send: $response"
    fi
}

run_monitor() {
    log_success "Network Monitor Agent started"
    log_info "Agent ID: $AGENT_ID"
    log_info "API URL: $API_URL"
    
    check_dependencies
    send_heartbeat
    
    while true; do
        devices=$(scan_network)
        
        if [ ! -z "$devices" ] && [ "$devices" != "[]" ]; then
            send_devices "$devices"
        fi
        
        send_heartbeat
        
        log_info "Waiting ${SCAN_INTERVAL}s..."
        sleep "$SCAN_INTERVAL"
    done
}

if [ "$EUID" -ne 0 ]; then
    log_error "Must run with sudo: sudo $0"
    exit 1
fi

if [ -z "$API_KEY" ]; then
    log_error "API_KEY not set"
    exit 1
fi

run_monitor
