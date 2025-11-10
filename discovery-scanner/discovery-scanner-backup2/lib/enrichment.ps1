# ============================================
# Device Enrichment Functions for PowerShell
# Multi-protocol network device discovery
# ============================================

# Function to enrich via IPP (Internet Printing Protocol)
function Invoke-IppEnrichment {
    param(
        [string]$IPAddress,
        [int]$Port = 631
    )
    
    try {
        # Test if IPP port is open
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IPAddress, $Port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        
        if (!$wait) {
            $tcpClient.Close()
            return $null
        }
        
        $tcpClient.EndConnect($connect)
        $stream = $tcpClient.GetStream()
        
        # Simplified IPP Get-Printer-Attributes request
        # This is a basic request - full IPP is more complex
        $ippRequest = [byte[]]@(
            0x01, 0x01,  # IPP version 1.1
            0x00, 0x0b,  # Get-Printer-Attributes operation
            0x00, 0x00, 0x00, 0x01  # request-id
        )
        
        $stream.Write($ippRequest, 0, $ippRequest.Length)
        $stream.Flush()
        
        $buffer = New-Object byte[] 4096
        $bytesRead = $stream.Read($buffer, 0, $buffer.Length)
        
        if ($bytesRead -gt 0) {
            $response = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $bytesRead)
            
            # Extract printer make/model from response
            if ($response -match "HP|Canon|Epson|Brother|Xerox|Ricoh|Lexmark") {
                $manufacturer = $matches[0]
                $model = if ($response -match "$manufacturer[^\s]+[\s]+[^\s]+") { $matches[0] } else { $manufacturer }
                
                $stream.Close()
                $tcpClient.Close()
                
                return @{
                    Protocol = "IPP"
                    Manufacturer = $manufacturer
                    Model = $model
                    DeviceType = "printer"
                }
            }
        }
        
        $stream.Close()
        $tcpClient.Close()
    }
    catch {
        # IPP not available
    }
    
    return $null
}

# Function to enrich via mDNS/Bonjour
function Invoke-MdnsEnrichment {
    param([string]$IPAddress)
    
    try {
        # Windows doesn't have built-in mDNS tools, use DNS-SD if available
        if (Get-Command dns-sd -ErrorAction SilentlyContinue) {
            $output = & dns-sd -Q "$IPAddress.local" 2>&1 | Out-String
            
            if ($output -match "ty=([^,]+)") {
                $model = $matches[1]
                $manufacturer = ($model -split '\s+')[0]
                
                return @{
                    Protocol = "mDNS"
                    Manufacturer = $manufacturer
                    Model = $model
                    DeviceType = "printer"
                }
            }
        }
    }
    catch {
        # mDNS not available
    }
    
    return $null
}

# Function to enrich via SSDP/UPnP
function Invoke-SsdpEnrichment {
    param([string]$IPAddress)
    
    try {
        $udpClient = New-Object System.Net.Sockets.UdpClient
        $udpClient.Client.ReceiveTimeout = 3000
        
        $ssdpMessage = @"
M-SEARCH * HTTP/1.1
HOST: 239.255.255.250:1900
MAN: "ssdp:discover"
MX: 3
ST: ssdp:all

"@
        
        $bytes = [System.Text.Encoding]::ASCII.GetBytes($ssdpMessage)
        $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Parse($IPAddress), 1900)
        
        [void]$udpClient.Send($bytes, $bytes.Length, $endpoint)
        
        $remoteEP = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any, 0)
        $response = $udpClient.Receive([ref]$remoteEP)
        $responseText = [System.Text.Encoding]::ASCII.GetString($response)
        
        $udpClient.Close()
        
        if ($responseText -match "SERVER:\s*(.+)") {
            $server = $matches[1].Trim()
            
            $deviceType = "unknown"
            if ($server -match "camera|nvr|ipc") { $deviceType = "camera" }
            elseif ($server -match "nas|storage") { $deviceType = "nas" }
            elseif ($server -match "router|gateway") { $deviceType = "router" }
            
            $manufacturer = if ($server -match "(Synology|QNAP|Netgear|TP-Link|D-Link|Hikvision|Dahua|Ubiquiti)") { 
                $matches[1] 
            } else { 
                $null 
            }
            
            return @{
                Protocol = "SSDP"
                Manufacturer = $manufacturer
                DeviceType = $deviceType
            }
        }
    }
    catch {
        # SSDP not available
    }
    
    return $null
}

# Function to enrich via HTTP
function Invoke-HttpEnrichment {
    param([string]$IPAddress)
    
    $ports = @(80, 443, 8080, 8443)
    
    foreach ($port in $ports) {
        try {
            $protocol = if ($port -in @(443, 8443)) { "https" } else { "http" }
            $url = "${protocol}://${IPAddress}:${port}"
            
            # Disable SSL certificate validation for HTTPS
            [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            
            $request = [System.Net.WebRequest]::Create($url)
            $request.Timeout = 3000
            $request.Method = "HEAD"
            
            $response = $request.GetResponse()
            $server = $response.Headers["Server"]
            $response.Close()
            
            if ($server) {
                $deviceType = "unknown"
                if ($server -match "printer|cups|ipp") { $deviceType = "printer" }
                elseif ($server -match "camera|ipcam|dvr|nvr") { $deviceType = "camera" }
                elseif ($server -match "nas|storage") { $deviceType = "nas" }
                elseif ($server -match "router|gateway|switch") { $deviceType = "network-device" }
                
                $manufacturer = if ($server -match "(HP|Canon|Epson|Brother|Cisco|Juniper|Aruba|Synology|QNAP|Hikvision|Dahua|Ubiquiti|TP-Link)") { 
                    $matches[1] 
                } else { 
                    $null 
                }
                
                # Try to get HTML title
                try {
                    $webClient = New-Object System.Net.WebClient
                    $webClient.Headers.Add("User-Agent", "Mozilla/5.0")
                    $html = $webClient.DownloadString($url)
                    
                    if ($html -match "<title>([^<]+)</title>") {
                        $title = $matches[1]
                        if ($title -match "([A-Z0-9]+-[A-Z0-9]+|[A-Z][0-9]{3,}[A-Z]?)") {
                            $model = $matches[1]
                        }
                    }
                }
                catch {
                    # Title extraction failed
                }
                
                return @{
                    Protocol = "HTTP"
                    Manufacturer = $manufacturer
                    Model = $model
                    DeviceType = $deviceType
                }
            }
        }
        catch {
            # HTTP not available on this port, try next
            continue
        }
    }
    
    return $null
}

# Function to enrich via ONVIF (for IP cameras)
function Invoke-OnvifEnrichment {
    param([string]$IPAddress)
    
    try {
        $uuid = [guid]::NewGuid().ToString()
        
        $onvifProbe = @"
<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing">
  <s:Header>
    <a:Action s:mustUnderstand="1">http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>
    <a:MessageID>uuid:$uuid</a:MessageID>
    <a:To s:mustUnderstand="1">urn:schemas-xmlsoap-org:ws:2005:04:discovery</a:To>
  </s:Header>
  <s:Body>
    <Probe xmlns="http://schemas.xmlsoap.org/ws/2005/04/discovery">
      <d:Types xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" xmlns:dp0="http://www.onvif.org/ver10/network/wsdl">dp0:NetworkVideoTransmitter</d:Types>
    </Probe>
  </s:Body>
</s:Envelope>
"@
        
        $udpClient = New-Object System.Net.Sockets.UdpClient
        $udpClient.Client.ReceiveTimeout = 3000
        
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($onvifProbe)
        $endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Parse($IPAddress), 3702)
        
        [void]$udpClient.Send($bytes, $bytes.Length, $endpoint)
        
        $remoteEP = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any, 0)
        $response = $udpClient.Receive([ref]$remoteEP)
        $responseText = [System.Text.Encoding]::UTF8.GetString($response)
        
        $udpClient.Close()
        
        if ($responseText -match "ProbeMatch") {
            $manufacturer = if ($responseText -match "(Hikvision|Dahua|Axis|Sony)") { $matches[1] } else { $null }
            $model = if ($responseText -match "model=([^<\s]+)") { $matches[1] } else { $null }
            
            return @{
                Protocol = "ONVIF"
                Manufacturer = $manufacturer
                Model = $model
                DeviceType = "camera"
            }
        }
    }
    catch {
        # ONVIF not available
    }
    
    return $null
}

# Function to enrich via MAC OUI lookup
function Invoke-OuiEnrichment {
    param([string]$MacAddress)
    
    if ([string]::IsNullOrEmpty($MacAddress)) {
        return $null
    }
    
    # Extract OUI (first 6 hex digits)
    $oui = $MacAddress.Replace(":", "").Replace("-", "").Substring(0, 6).ToUpper()
    
    # Local OUI database (subset of common vendors)
    $ouiDb = @{
        "000C29" = "VMware"
        "005056" = "VMware"
        "00155D" = "Microsoft"
        "001AA0" = "Dell"
        "0010E0" = "HP"
        "001B63" = "HP"
        "0025B3" = "HP"
        "001E67" = "Canon"
        "00176C" = "Brother"
        "001714" = "Epson"
        "008066" = "Xerox"
        "B827EB" = "Raspberry Pi"
        "DCA632" = "Raspberry Pi"
        "00248C" = "Cisco"
        "001F9E" = "Cisco"
        "68A86D" = "Cisco"
        "002219" = "Synology"
        "001132" = "QNAP"
        "742B62" = "Ubiquiti"
        "DC9FDB" = "Ubiquiti"
    }
    
    if ($ouiDb.ContainsKey($oui)) {
        $manufacturer = $ouiDb[$oui]
        
        $deviceType = "unknown"
        if ($manufacturer -in @("Canon", "Brother", "Epson", "Xerox", "HP")) {
            $deviceType = "printer"
        }
        elseif ($manufacturer -in @("Cisco")) {
            $deviceType = "network-device"
        }
        elseif ($manufacturer -in @("Synology", "QNAP")) {
            $deviceType = "nas"
        }
        
        return @{
            Protocol = "OUI"
            Manufacturer = $manufacturer
            DeviceType = $deviceType
        }
    }
    
    return $null
}

# Main enrichment function - tries all protocols
function Invoke-DeviceEnrichment {
    param(
        [string]$IPAddress,
        [string]$MacAddress = $null,
        [string]$ExistingManufacturer = $null,
        [string]$ExistingModel = $null
    )
    
    # If we already have complete data, skip enrichment
    if (![string]::IsNullOrEmpty($ExistingManufacturer) -and ![string]::IsNullOrEmpty($ExistingModel)) {
        return @{
            Manufacturer = $ExistingManufacturer
            Model = $ExistingModel
            Protocols = @()
            Confidence = 1.0
        }
    }
    
    $result = @{
        Manufacturer = $ExistingManufacturer
        Model = $ExistingModel
        SerialNumber = $null
        DeviceType = $null
        FirmwareVersion = $null
        Protocols = @()
        Confidence = 0.0
    }
    
    # Debug: Write-Host "[Enrichment] Attempting multi-protocol enrichment for $IPAddress" -ForegroundColor Cyan
    
    # Try IPP
    if ([string]::IsNullOrEmpty($result.Manufacturer) -or [string]::IsNullOrEmpty($result.Model)) {
        $ippResult = Invoke-IppEnrichment -IPAddress $IPAddress
        if ($ippResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $ippResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.Model)) { $result.Model = $ippResult.Model }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $ippResult.DeviceType }
            $result.Protocols += "IPP"
        }
    }
    
    # Try mDNS
    if ([string]::IsNullOrEmpty($result.Manufacturer)) {
        $mdnsResult = Invoke-MdnsEnrichment -IPAddress $IPAddress
        if ($mdnsResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $mdnsResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.Model)) { $result.Model = $mdnsResult.Model }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $mdnsResult.DeviceType }
            $result.Protocols += "mDNS"
        }
    }
    
    # Try SSDP
    if ([string]::IsNullOrEmpty($result.Manufacturer) -or [string]::IsNullOrEmpty($result.DeviceType)) {
        $ssdpResult = Invoke-SsdpEnrichment -IPAddress $IPAddress
        if ($ssdpResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $ssdpResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $ssdpResult.DeviceType }
            $result.Protocols += "SSDP"
        }
    }
    
    # Try HTTP
    if ([string]::IsNullOrEmpty($result.Manufacturer)) {
        $httpResult = Invoke-HttpEnrichment -IPAddress $IPAddress
        if ($httpResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $httpResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.Model)) { $result.Model = $httpResult.Model }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $httpResult.DeviceType }
            $result.Protocols += "HTTP"
        }
    }
    
    # Try ONVIF
    if ([string]::IsNullOrEmpty($result.DeviceType) -or $result.DeviceType -eq "unknown") {
        $onvifResult = Invoke-OnvifEnrichment -IPAddress $IPAddress
        if ($onvifResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $onvifResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.Model)) { $result.Model = $onvifResult.Model }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $onvifResult.DeviceType }
            $result.Protocols += "ONVIF"
        }
    }
    
    # Try OUI as last resort
    if ([string]::IsNullOrEmpty($result.Manufacturer) -and ![string]::IsNullOrEmpty($MacAddress)) {
        $ouiResult = Invoke-OuiEnrichment -MacAddress $MacAddress
        if ($ouiResult) {
            if ([string]::IsNullOrEmpty($result.Manufacturer)) { $result.Manufacturer = $ouiResult.Manufacturer }
            if ([string]::IsNullOrEmpty($result.DeviceType)) { $result.DeviceType = $ouiResult.DeviceType }
            $result.Protocols += "OUI"
        }
    }
    
    # Calculate confidence score
    $confidence = 0.0
    if (![string]::IsNullOrEmpty($result.Manufacturer)) { $confidence += 0.2 }
    if (![string]::IsNullOrEmpty($result.Model)) { $confidence += 0.2 }
    if (![string]::IsNullOrEmpty($result.SerialNumber)) { $confidence += 0.15 }
    if (![string]::IsNullOrEmpty($result.DeviceType)) { $confidence += 0.15 }
    if ($result.Protocols.Count -ge 2) { $confidence += 0.1 }
    
    $result.Confidence = [Math]::Min($confidence, 1.0)
    
    # Debug: if ($result.Protocols.Count -gt 0) {
    #     Write-Host "[Enrichment] Success! Used: $($result.Protocols -join ', ')" -ForegroundColor Green
    # }
    
    return $result
}
