#!/bin/bash
# ============================================
# Device Enrichment Library
# Multi-protocol device discovery functions
# Can be sourced by discovery scripts
# ============================================

# IPP Discovery for Printers
enrich_via_ipp() {
    local ip=$1
    local port=${2:-631}
    local result=""
    
    # Check if IPP port is open
    timeout 1 bash -c "echo >/dev/tcp/$ip/$port" 2>/dev/null || return 1
    
    # Use ipptool if available (macOS/Linux with CUPS)
    if command -v ipptool &> /dev/null; then
        # Create temporary IPP request file
        local ipp_req=$(mktemp)
        cat > "$ipp_req" <<'EOF'
{
    OPERATION Get-Printer-Attributes
    GROUP operation-attributes-tag
    ATTR charset attributes-charset utf-8
    ATTR language attributes-natural-language en
    ATTR uri printer-uri $uri
    
    STATUS successful-ok
}
EOF
        
        local ipp_output=$(ipptool -t "ipp://$ip:$port/ipp/print" "$ipp_req" 2>/dev/null)
        rm -f "$ipp_req"
        
        if [ -n "$ipp_output" ]; then
            # Extract make-and-model
            local make_model=$(echo "$ipp_output" | grep -i "printer-make-and-model" | sed 's/.*= *"\([^"]*\)".*/\1/')
            # Extract device-id (contains manufacturer, model, serial)
            local device_id=$(echo "$ipp_output" | grep -i "printer-device-id" | sed 's/.*= *"\([^"]*\)".*/\1/')
            
            if [ -n "$device_id" ]; then
                # Parse device-id: MFG:HP;MDL:LaserJet M404n;SN:CN123456;
                local mfg=$(echo "$device_id" | grep -o "MFG:[^;]*" | cut -d: -f2)
                local mdl=$(echo "$device_id" | grep -o "MDL:[^;]*" | cut -d: -f2)
                local sn=$(echo "$device_id" | grep -o "SN:[^;]*" | cut -d: -f2)
                
                echo "IPP|$mfg|$mdl|$sn|printer"
                return 0
            elif [ -n "$make_model" ]; then
                # Parse make_model: "HP LaserJet M404n"
                local mfg=$(echo "$make_model" | awk '{print $1}')
                echo "IPP|$mfg|$make_model||printer"
                return 0
            fi
        fi
    fi
    
    # Fallback: Raw IPP request using netcat/telnet
    if command -v nc &> /dev/null; then
        # Simplified IPP GET request
        local response=$(echo -ne '\x01\x01\x00\x0b\x00\x00\x00\x01\x01\x47\x00\x12attributes-charset\x00\x05utf-8\x48\x00\x1battributes-natural-language\x00\x05en-us\x45\x00\x0bprinter-uri\x00\x1aipp://'$ip':631/ipp/print\x03' | nc -w 3 "$ip" "$port" 2>/dev/null)
        
        if [ -n "$response" ]; then
            # Try to extract printable strings
            local make_model=$(echo "$response" | strings | grep -i -E "(HP|Canon|Epson|Brother|Xerox)" | head -1)
            if [ -n "$make_model" ]; then
                echo "IPP||$make_model||printer"
                return 0
            fi
        fi
    fi
    
    return 1
}

# mDNS/Bonjour Discovery
enrich_via_mdns() {
    local ip=$1
    
    # macOS: use dns-sd
    if command -v dns-sd &> /dev/null; then
        # Browse for printers
        local mdns_output=$(timeout 5 dns-sd -B _ipp._tcp 2>/dev/null | grep "$ip" -A 5)
        
        if [ -z "$mdns_output" ]; then
            mdns_output=$(timeout 5 dns-sd -B _printer._tcp 2>/dev/null | grep "$ip" -A 5)
        fi
        
        if [ -n "$mdns_output" ]; then
            # Extract device info from TXT records
            local txt_record=$(echo "$mdns_output" | grep "TXT" | head -1)
            
            # Parse TXT: ty=HP LaserJet M404 mfg=HP product=(HP LaserJet M404n)
            local ty=$(echo "$txt_record" | grep -o "ty=[^,]*" | cut -d= -f2)
            local mfg=$(echo "$txt_record" | grep -o "mfg=[^,]*" | cut -d= -f2)
            local product=$(echo "$txt_record" | grep -o "product=([^)]*)" | sed 's/product=(\(.*\))/\1/')
            
            [ -z "$mfg" ] && mfg=$(echo "$ty" | awk '{print $1}')
            [ -z "$product" ] && product="$ty"
            
            echo "mDNS|$mfg|$product||printer"
            return 0
        fi
    fi
    
    # Linux: use avahi-browse
    if command -v avahi-browse &> /dev/null; then
        local avahi_output=$(timeout 5 avahi-browse -t -r _ipp._tcp 2>/dev/null | grep "$ip" -A 10)
        
        if [ -z "$avahi_output" ]; then
            avahi_output=$(timeout 5 avahi-browse -t -r _printer._tcp 2>/dev/null | grep "$ip" -A 10)
        fi
        
        if [ -n "$avahi_output" ]; then
            local ty=$(echo "$avahi_output" | grep "ty =" | head -1 | sed 's/.*= *\[\(.*\)\]/\1/')
            local mfg=$(echo "$avahi_output" | grep "mfg =" | head -1 | sed 's/.*= *\[\(.*\)\]/\1/')
            
            [ -z "$mfg" ] && mfg=$(echo "$ty" | awk '{print $1}')
            
            echo "mDNS|$mfg|$ty||printer"
            return 0
        fi
    fi
    
    return 1
}

# SSDP/UPnP Discovery
enrich_via_ssdp() {
    local ip=$1
    
    # Send SSDP M-SEARCH
    local ssdp_request='M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 3\r\nST: ssdp:all\r\n\r\n'
    
    # Use nc or socat to send UDP
    if command -v nc &> /dev/null; then
        local response=$(echo -ne "$ssdp_request" | nc -u -w 3 "$ip" 1900 2>/dev/null)
        
        if [ -n "$response" ]; then
            # Extract SERVER header
            local server=$(echo "$response" | grep -i "^SERVER:" | sed 's/SERVER: *//i' | tr -d '\r')
            local location=$(echo "$response" | grep -i "^LOCATION:" | sed 's/LOCATION: *//i' | tr -d '\r')
            
            # Infer device type and manufacturer
            local device_type="unknown"
            local manufacturer=""
            
            if echo "$server" | grep -qi "camera\|nvr\|ipc"; then
                device_type="camera"
            elif echo "$server" | grep -qi "nas\|storage"; then
                device_type="nas"
            elif echo "$server" | grep -qi "router\|gateway"; then
                device_type="router"
            fi
            
            # Extract manufacturer from server string
            manufacturer=$(echo "$server" | grep -oiE "(Synology|QNAP|Netgear|TP-Link|D-Link|Hikvision|Dahua|Ubiquiti)" | head -1)
            
            echo "SSDP|$manufacturer||$device_type"
            return 0
        fi
    fi
    
    return 1
}

# HTTP Banner Grabbing
enrich_via_http() {
    local ip=$1
    local ports="80 443 8080 8443"
    
    for port in $ports; do
        # Determine protocol
        local protocol="http"
        [ "$port" = "443" ] || [ "$port" = "8443" ] && protocol="https"
        
        # Try to get headers (ignore SSL errors for https)
        local response=""
        if [ "$protocol" = "https" ]; then
            response=$(curl -k -s -m 3 -I "$protocol://$ip:$port" 2>/dev/null)
        else
            response=$(curl -s -m 3 -I "$protocol://$ip:$port" 2>/dev/null)
        fi
        
        if [ -n "$response" ]; then
            # Extract Server header
            local server=$(echo "$response" | grep -i "^Server:" | sed 's/Server: *//i' | tr -d '\r')
            
            if [ -n "$server" ]; then
                local device_type="unknown"
                local manufacturer=""
                
                # Infer device type
                if echo "$server" | grep -qi "printer\|cups\|ipp"; then
                    device_type="printer"
                elif echo "$server" | grep -qi "camera\|ipcam\|dvr\|nvr"; then
                    device_type="camera"
                elif echo "$server" | grep -qi "nas\|storage"; then
                    device_type="nas"
                elif echo "$server" | grep -qi "router\|gateway\|switch"; then
                    device_type="network-device"
                fi
                
                # Extract manufacturer
                manufacturer=$(echo "$server" | grep -oiE "(HP|Canon|Epson|Brother|Cisco|Juniper|Aruba|Synology|QNAP|Hikvision|Dahua|Ubiquiti|TP-Link)" | head -1)
                
                # Try to get HTML title
                local title=""
                if [ "$protocol" = "https" ]; then
                    title=$(curl -k -s -m 3 "$protocol://$ip:$port" 2>/dev/null | grep -o "<title>[^<]*</title>" | sed 's/<title>\(.*\)<\/title>/\1/')
                else
                    title=$(curl -s -m 3 "$protocol://$ip:$port" 2>/dev/null | grep -o "<title>[^<]*</title>" | sed 's/<title>\(.*\)<\/title>/\1/')
                fi
                
                echo "HTTP|$manufacturer|$title||$device_type"
                return 0
            fi
        fi
    done
    
    return 1
}

# ONVIF Discovery for Cameras
enrich_via_onvif() {
    local ip=$1
    local port=3702
    
    # ONVIF WS-Discovery Probe (simplified)
    local uuid=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || uuidgen 2>/dev/null || echo "00000000-0000-0000-0000-000000000000")
    
    local probe='<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <s:Header>
    <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
    <a:MessageID>uuid:'$uuid'</a:MessageID>
    <a:To s:mustUnderstand="1">urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
  </s:Header>
  <s:Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <d:Types xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dp0="http://www.onvif.org/ver10/network/wsdl">dp0:NetworkVideoTransmitter</d:Types>
    </Probe>
  </s:Body>
</s:Envelope>'
    
    if command -v nc &> /dev/null; then
        local response=$(echo "$probe" | nc -u -w 3 "$ip" "$port" 2>/dev/null)
        
        if [ -n "$response" ] && echo "$response" | grep -q "ProbeMatch"; then
            # Extract manufacturer and model
            local manufacturer=$(echo "$response" | grep -oE "(Hikvision|Dahua|Axis|Sony)" | head -1)
            local model=$(echo "$response" | grep -o "model=[^<]*" | cut -d= -f2 | head -1)
            
            echo "ONVIF|$manufacturer|$model||camera"
            return 0
        fi
    fi
    
    return 1
}

# MAC OUI Lookup
enrich_via_oui() {
    local mac=$1
    
    # Extract OUI (first 6 hex digits)
    local oui=$(echo "$mac" | tr -d ':-' | tr '[:lower:]' '[:upper:]' | cut -c1-6)
    
    # Common OUI database (subset)
    case "$oui" in
        "000C29"|"005056") echo "OUI|VMware|||" ;;
        "00155D") echo "OUI|Microsoft|||" ;;
        "001AA0") echo "OUI|Dell|||" ;;
        "0010E0"|"001B63"|"0025B3") echo "OUI|HP|||" ;;
        "001E67") echo "OUI|Canon|||printer" ;;
        "00176C") echo "OUI|Brother|||printer" ;;
        "001714") echo "OUI|Epson|||printer" ;;
        "008066") echo "OUI|Xerox|||printer" ;;
        "B827EB"|"DCA632") echo "OUI|Raspberry Pi|||" ;;
        "00248C"|"001F9E"|"68A86D") echo "OUI|Cisco|||network-device" ;;
        "002219") echo "OUI|Synology|||nas" ;;
        "001132") echo "OUI|QNAP|||nas" ;;
        "742B62"|"DC9FDB") echo "OUI|Ubiquiti|||network-device" ;;
        *) return 1 ;;
    esac
    
    return 0
}

# Main enrichment function - tries all methods in priority order
enrich_device() {
    local ip=$1
    local mac=$2
    local existing_manufacturer=$3
    local existing_model=$4
    
    # If we already have complete data, skip enrichment
    if [ -n "$existing_manufacturer" ] && [ -n "$existing_model" ]; then
        return 0
    fi
    
    local enrichment_result=""
    local protocols=()
    local final_manufacturer="$existing_manufacturer"
    local final_model="$existing_model"
    local final_serial=""
    local final_device_type=""
    
    # Try IPP (for printers)
    if enrichment_result=$(enrich_via_ipp "$ip" 2>/dev/null); then
        IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
        protocols+=("IPP")
        [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
        [ -z "$final_model" ] && [ -n "$mdl" ] && final_model="$mdl"
        [ -z "$final_serial" ] && [ -n "$sn" ] && final_serial="$sn"
        [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
    fi
    
    # Try mDNS
    if [ -z "$final_manufacturer" ] || [ -z "$final_model" ]; then
        if enrichment_result=$(enrich_via_mdns "$ip" 2>/dev/null); then
            IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
            protocols+=("mDNS")
            [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
            [ -z "$final_model" ] && [ -n "$mdl" ] && final_model="$mdl"
            [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
        fi
    fi
    
    # Try SSDP
    if [ -z "$final_manufacturer" ] || [ -z "$final_device_type" ]; then
        if enrichment_result=$(enrich_via_ssdp "$ip" 2>/dev/null); then
            IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
            protocols+=("SSDP")
            [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
            [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
        fi
    fi
    
    # Try HTTP
    if [ -z "$final_manufacturer" ]; then
        if enrichment_result=$(enrich_via_http "$ip" 2>/dev/null); then
            IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
            protocols+=("HTTP")
            [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
            [ -z "$final_model" ] && [ -n "$mdl" ] && final_model="$mdl"
            [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
        fi
    fi
    
    # Try ONVIF (for cameras)
    if [ -z "$final_device_type" ] || [ "$final_device_type" = "unknown" ]; then
        if enrichment_result=$(enrich_via_onvif "$ip" 2>/dev/null); then
            IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
            protocols+=("ONVIF")
            [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
            [ -z "$final_model" ] && [ -n "$mdl" ] && final_model="$mdl"
            [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
        fi
    fi
    
    # Try OUI lookup as last resort
    if [ -z "$final_manufacturer" ] && [ -n "$mac" ]; then
        if enrichment_result=$(enrich_via_oui "$mac" 2>/dev/null); then
            IFS='|' read -r protocol mfg mdl sn dtype <<< "$enrichment_result"
            protocols+=("OUI")
            [ -z "$final_manufacturer" ] && [ -n "$mfg" ] && final_manufacturer="$mfg"
            [ -z "$final_device_type" ] && [ -n "$dtype" ] && final_device_type="$dtype"
        fi
    fi
    
    # Output enriched data
    echo "ENRICHED|$final_manufacturer|$final_model|$final_serial|$final_device_type|${protocols[*]}"
    return 0
}
