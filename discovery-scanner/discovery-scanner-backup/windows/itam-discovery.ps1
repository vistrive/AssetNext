# ============================================
# ITAM Network Discovery Scanner - Windows
# PowerShell-based SNMP Discovery Tool
# ============================================

param(
    [string]$JobId = "",
    [string]$Token = "",
    [string]$ServerUrl = "http://localhost:5050",
    [string]$Cidr = "",
    [string]$Interface = ""
)

# If JobId and Token are not provided via command line, read from config file
if ([string]::IsNullOrEmpty($JobId) -or [string]::IsNullOrEmpty($Token)) {
    $configPath = Join-Path $PSScriptRoot "config.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $JobId = $config.jobId
        $Token = $config.token
        $ServerUrl = $config.serverUrl
    }
}

# Configuration
$BatchSize = 20  # Send results in batches
$PingTimeout = 1000  # 1 second timeout for ping
$SnmpTimeout = 3000  # 3 seconds for SNMP queries
$MaxThreads = 50  # Parallel scanning threads

# SNMP OIDs
$OID_sysDescr = "1.3.6.1.2.1.1.1.0"
$OID_sysObjectID = "1.3.6.1.2.1.1.2.0"
$OID_sysName = "1.3.6.1.2.1.1.5.0"
$OID_sysLocation = "1.3.6.1.2.1.1.6.0"
$OID_sysContact = "1.3.6.1.2.1.1.4.0"
$OID_ifTable = "1.3.6.1.2.1.2.2.1"
$OID_serialNumber = "1.3.6.1.2.1.47.1.1.1.1.11"  # entPhysicalSerialNum
$OID_manufacturer = "1.3.6.1.2.1.47.1.1.1.1.12"  # entPhysicalMfgName
$OID_modelName = "1.3.6.1.2.1.47.1.1.1.1.13"     # entPhysicalModelName

# Discovered devices collection
$script:DiscoveredDevices = [System.Collections.ArrayList]::new()
$script:ResultsLock = New-Object System.Threading.Mutex

# ============================================
# ENRICHMENT LIBRARY - Inline for distribution
# ============================================

# Load enrichment functions from external file
$enrichmentPath = Join-Path $PSScriptRoot "lib\enrichment.ps1"
if (Test-Path $enrichmentPath) {
    . $enrichmentPath
}

# If external file doesn't exist, functions should be embedded here during build
# For now, we'll continue with external reference

# ============================================

# Function to check if SNMP tools are available
function Test-SnmpAvailable {
    try {
        Get-Command snmpget -ErrorAction Stop | Out-Null
        return $true
    } catch {
        Write-Host "WARNING: SNMP tools not found. Installing Net-SNMP..." -ForegroundColor Yellow
        return $false
    }
}

# Function to install Net-SNMP (requires admin rights)
function Install-NetSnmp {
    Write-Host "Net-SNMP is required for network discovery." -ForegroundColor Yellow
    Write-Host "Please install Net-SNMP from: https://sourceforge.net/projects/net-snmp/" -ForegroundColor Yellow
    Write-Host "Or use: choco install net-snmp" -ForegroundColor Yellow
    return $false
}

# Function to get the active network interface with default gateway
function Get-ActiveInterface {
    param([string]$ManualInterface)
    
    # If manual interface specified, use it
    if ($ManualInterface) {
        $adapter = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias $ManualInterface -ErrorAction SilentlyContinue |
                   Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
                   Select-Object -First 1
        
        if ($adapter) {
            $interfaceIndex = $adapter.InterfaceIndex
            return @{
                Adapter = $adapter
                InterfaceAlias = $ManualInterface
                InterfaceIndex = $interfaceIndex
            }
        }
    }
    
    # Get the interface with default gateway (0.0.0.0/0)
    $defaultRoute = Get-NetRoute -DestinationPrefix "0.0.0.0/0" -ErrorAction SilentlyContinue | 
                    Sort-Object -Property RouteMetric | 
                    Select-Object -First 1
    
    if ($defaultRoute) {
        $interfaceIndex = $defaultRoute.InterfaceIndex
        $adapter = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $interfaceIndex -ErrorAction SilentlyContinue |
                   Where-Object { $_.IPAddress -notlike "169.254.*" -and $_.IPAddress -notlike "127.*" } |
                   Select-Object -First 1
        
        if ($adapter) {
            $interfaceAlias = (Get-NetAdapter -InterfaceIndex $interfaceIndex -ErrorAction SilentlyContinue).Name
            return @{
                Adapter = $adapter
                InterfaceAlias = $interfaceAlias
                InterfaceIndex = $interfaceIndex
            }
        }
    }
    
    return $null
}

# Function to get local network range
function Get-LocalNetworkRange {
    param(
        [string]$ManualCIDR,
        [string]$ManualInterface
    )
    
    # Priority 1: Use manually specified CIDR if provided
    if ($ManualCIDR) {
        Write-Host "Using manual CIDR: $ManualCIDR" -ForegroundColor Green
        return @(@{
            Network = $ManualCIDR
            StartIP = $ManualCIDR.Split('/')[0].Substring(0, $ManualCIDR.LastIndexOf('.')) + ".1"
            EndIP = $ManualCIDR.Split('/')[0].Substring(0, $ManualCIDR.LastIndexOf('.')) + ".254"
        })
    }
    
    # Priority 2: Auto-detect active interface with default gateway
    $activeInterface = Get-ActiveInterface -ManualInterface $ManualInterface
    
    if ($activeInterface) {
        $adapter = $activeInterface.Adapter
        $ip = $adapter.IPAddress
        $prefix = $adapter.PrefixLength
        
        # Determine interface type
        $interfaceType = "Unknown"
        $alias = $activeInterface.InterfaceAlias
        if ($alias -like "*Wi-Fi*" -or $alias -like "*Wireless*" -or $alias -like "*WLAN*") {
            $interfaceType = "Wi-Fi"
        } elseif ($alias -like "*Ethernet*" -or $alias -like "*LAN*") {
            $interfaceType = "Ethernet"
        }
        
        # Calculate network address
        $ipBytes = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
        [uint32]$ipInt = [BitConverter]::ToUInt32($ipBytes[3..0], 0)
        [uint32]$maskInt = [Convert]::ToUInt32(("1" * $prefix + "0" * (32 - $prefix)), 2)
        [uint32]$networkInt = $ipInt -band $maskInt
        $networkBytes = [BitConverter]::GetBytes($networkInt)[3..0]
        $networkAddr = [System.Net.IPAddress]::new($networkBytes)
        
        $cidr = "$networkAddr/$prefix"
        
        Write-Host "Detected active interface: $alias ($interfaceType)" -ForegroundColor Green
        Write-Host "Local IP: $ip/$prefix" -ForegroundColor Green
        Write-Host "Using network: $cidr" -ForegroundColor Green
        Write-Host ""
        
        return @(@{
            Network = $cidr
            StartIP = "$($networkBytes[0]).$($networkBytes[1]).$($networkBytes[2]).1"
            EndIP = "$($networkBytes[0]).$($networkBytes[1]).$($networkBytes[2]).254"
        })
    }
    
    # Priority 3: Fall back to all active interfaces (excluding virtual ones)
    Write-Warning "Could not detect default gateway, scanning all active interfaces"
    
    $adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
        $_.InterfaceAlias -notlike "*Loopback*" -and 
        $_.IPAddress -notlike "169.254.*" -and
        $_.IPAddress -notlike "172.1[6-9].*" -and
        $_.IPAddress -notlike "172.2[0-9].*" -and
        $_.IPAddress -notlike "172.3[0-1].*" -and
        $_.IPAddress -notlike "192.168.64.*" -and
        $_.IPAddress -notlike "10.0.2.*"
    }
    
    $ranges = @()
    foreach ($adapter in $adapters) {
        $ip = $adapter.IPAddress
        $prefix = $adapter.PrefixLength
        
        # Calculate network range
        $ipBytes = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
        $networkPrefix = "$($ipBytes[0]).$($ipBytes[1]).$($ipBytes[2])"
        
        $ranges += @{
            Network = "$networkPrefix.0/$prefix"
            StartIP = "$networkPrefix.1"
            EndIP = "$networkPrefix.254"
        }
    }
    
    return $ranges
}

# Function to ping a host
function Test-HostAlive {
    param([string]$IPAddress)
    
    $ping = New-Object System.Net.NetworkInformation.Ping
    try {
        $reply = $ping.Send($IPAddress, $PingTimeout)
        return $reply.Status -eq 'Success'
    } catch {
        return $false
    } finally {
        $ping.Dispose()
    }
}

# Function to scan open ports
function Get-OpenPorts {
    param([string]$IPAddress)
    
    $commonPorts = @(21, 22, 23, 25, 80, 443, 161, 162, 389, 445, 3389, 8080, 8443, 9100)
    $openPorts = @()
    
    foreach ($port in $commonPorts) {
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connect = $tcpClient.BeginConnect($IPAddress, $port, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(500, $false)
            
            if ($wait -and $tcpClient.Connected) {
                $openPorts += $port
            }
            
            $tcpClient.Close()
        } catch {
            # Port closed or unreachable
        }
    }
    
    return $openPorts
}

# Function to fingerprint device by ports
function Get-DeviceFingerprint {
    param([int[]]$OpenPorts)
    
    if ($OpenPorts -contains 9100) { return "printer" }
    if ($OpenPorts -contains 161) { return "network-device" }
    if (($OpenPorts -contains 80) -or ($OpenPorts -contains 443)) { return "web-server" }
    if ($OpenPorts -contains 3389) { return "windows-server" }
    if ($OpenPorts -contains 22) { return "linux-server" }
    if ($OpenPorts -contains 445) { return "file-server" }
    
    return "unknown-device"
}

# Function to query SNMP
function Get-SnmpValue {
    param(
        [string]$IPAddress,
        [string]$OID,
        [string]$Community = "public",
        [string]$Version = "2c"
    )
    
    try {
        $output = & snmpget -v $Version -c $Community -t 3 -r 1 $IPAddress $OID 2>&1
        
        if ($output -match "=\s*(.+)$") {
            $value = $matches[1].Trim()
            # Clean up the value
            $value = $value -replace '^(STRING|INTEGER|OID|Hex-STRING):\s*', ''
            $value = $value -replace '"', ''
            return $value
        }
    } catch {
        return $null
    }
    
    return $null
}

# Function to discover device via SNMP
function Discover-DeviceSnmp {
    param([string]$IPAddress)
    
    $device = @{
        ipAddress = $IPAddress
        macAddress = $null
        hostname = $null
        sysName = $null
        sysDescr = $null
        sysObjectID = $null
        serialNumber = $null
        manufacturer = $null
        model = $null
        osName = $null
        osVersion = $null
        interfaces = @()
        discoveryMethod = "port-fingerprint"
        status = "partial"
        openPorts = @()
        portFingerprint = "unknown"
        rawData = @{}
    }
    
    # Try SNMPv3 first (if credentials available)
    # For now, we'll skip SNMPv3 and try v2c
    
    # Try SNMPv2c with common community strings
    $communities = @("public", "private", "itam_public")
    $snmpSuccess = $false
    
    foreach ($community in $communities) {
        $sysDescr = Get-SnmpValue -IPAddress $IPAddress -OID $OID_sysDescr -Community $community
        
        if ($sysDescr) {
            $snmpSuccess = $true
            $device.sysDescr = $sysDescr
            $device.sysName = Get-SnmpValue -IPAddress $IPAddress -OID $OID_sysName -Community $community
            $device.sysObjectID = Get-SnmpValue -IPAddress $IPAddress -OID $OID_sysObjectID -Community $community
            
            # Try to get serial number
            $device.serialNumber = Get-SnmpValue -IPAddress $IPAddress -OID $OID_serialNumber -Community $community
            
            # Try to get manufacturer
            $device.manufacturer = Get-SnmpValue -IPAddress $IPAddress -OID $OID_manufacturer -Community $community
            
            # Try to get model
            $device.model = Get-SnmpValue -IPAddress $IPAddress -OID $OID_modelName -Community $community
            
            # Parse OS from sysDescr
            if ($sysDescr -match "(Windows|Linux|Cisco|HP|Dell)") {
                $device.osName = $matches[1]
            }
            
            $device.discoveryMethod = "snmpv2c"
            $device.status = "discovered"
            break
        }
    }
    
    # If SNMP failed, do port fingerprinting
    if (-not $snmpSuccess) {
        $openPorts = Get-OpenPorts -IPAddress $IPAddress
        $device.openPorts = $openPorts
        $device.portFingerprint = Get-DeviceFingerprint -OpenPorts $openPorts
        $device.status = "partial"
        
        # Try to resolve hostname
        try {
            $hostname = [System.Net.Dns]::GetHostEntry($IPAddress).HostName
            $device.hostname = $hostname
        } catch {
            # Hostname resolution failed
        }
    }
    
    # ============================================
    # ENRICHMENT PHASE - Multi-protocol discovery
    # ============================================
    $device.deviceType = $null
    $device.firmwareVersion = $null
    $device.confidence = 0.0
    $device.protocols = @()
    
    # If manufacturer or model is missing, try enrichment
    if ([string]::IsNullOrEmpty($device.manufacturer) -or [string]::IsNullOrEmpty($device.model)) {
        # Debug: Write-Host "[Enrichment] Attempting multi-protocol enrichment for $IPAddress" -ForegroundColor Cyan
        
        try {
            if (Get-Command Invoke-DeviceEnrichment -ErrorAction SilentlyContinue) {
                $enrichmentResult = Invoke-DeviceEnrichment -IPAddress $IPAddress -MacAddress $device.macAddress -ExistingManufacturer $device.manufacturer -ExistingModel $device.model
                
                if ($enrichmentResult) {
                    # Merge enrichment results
                    if ([string]::IsNullOrEmpty($device.manufacturer) -and ![string]::IsNullOrEmpty($enrichmentResult.Manufacturer)) {
                        $device.manufacturer = $enrichmentResult.Manufacturer
                    }
                    if ([string]::IsNullOrEmpty($device.model) -and ![string]::IsNullOrEmpty($enrichmentResult.Model)) {
                        $device.model = $enrichmentResult.Model
                    }
                    if ([string]::IsNullOrEmpty($device.serialNumber) -and ![string]::IsNullOrEmpty($enrichmentResult.SerialNumber)) {
                        $device.serialNumber = $enrichmentResult.SerialNumber
                    }
                    if ([string]::IsNullOrEmpty($device.deviceType) -and ![string]::IsNullOrEmpty($enrichmentResult.DeviceType)) {
                        $device.deviceType = $enrichmentResult.DeviceType
                    }
                    if ([string]::IsNullOrEmpty($device.firmwareVersion) -and ![string]::IsNullOrEmpty($enrichmentResult.FirmwareVersion)) {
                        $device.firmwareVersion = $enrichmentResult.FirmwareVersion
                    }
                    
                    $device.protocols = $enrichmentResult.Protocols
                    $device.confidence = $enrichmentResult.Confidence
                    
                    if ($device.protocols.Count -gt 0) {
                        $device.discoveryMethod = $device.protocols[0]
                        if ($device.status -eq "partial") {
                            $device.status = "discovered"
                        }
                    }
                    
                    # Debug: Write-Host "[Enrichment] Success! Used: $($enrichmentResult.Protocols -join ', ')" -ForegroundColor Green
                }
            }
        } catch {
            # Debug: Write-Host "[Enrichment] Failed: $_" -ForegroundColor Yellow
        }
    }
    
    # Calculate confidence score if not already set
    if ($device.confidence -eq 0.0) {
        $confidence = 0.0
        if (![string]::IsNullOrEmpty($device.manufacturer)) { $confidence += 0.2 }
        if (![string]::IsNullOrEmpty($device.model)) { $confidence += 0.2 }
        if (![string]::IsNullOrEmpty($device.serialNumber)) { $confidence += 0.15 }
        if (![string]::IsNullOrEmpty($device.hostname)) { $confidence += 0.1 }
        if (![string]::IsNullOrEmpty($device.deviceType)) { $confidence += 0.15 }
        if (![string]::IsNullOrEmpty($device.firmwareVersion)) { $confidence += 0.1 }
        if ($device.protocols.Count -ge 2) { $confidence += 0.1 }
        
        $device.confidence = [Math]::Min($confidence, 1.0)
    }
    
    return $device
}

# Function to scan IP range
function Scan-NetworkRange {
    param([hashtable]$Range)
    
    Write-Host "Scanning network: $($Range.Network)" -ForegroundColor Cyan
    
    $startOctet = [int]($Range.StartIP -split '\.')[-1]
    $endOctet = [int]($Range.EndIP -split '\.')[-1]
    $networkPrefix = ($Range.StartIP -split '\.')[0..2] -join '.'
    
    $jobs = @()
    
    for ($i = $startOctet; $i -le $endOctet; $i++) {
        $ip = "$networkPrefix.$i"
        
        # Limit concurrent jobs
        while ((Get-Job -State Running).Count -ge $MaxThreads) {
            Start-Sleep -Milliseconds 100
        }
        
        $jobs += Start-Job -ScriptBlock {
            param($IPAddress, $FunctionDef1, $FunctionDef2, $FunctionDef3, $FunctionDef4)
            
            # Re-define functions in job context
            Invoke-Expression $FunctionDef1
            Invoke-Expression $FunctionDef2
            Invoke-Expression $FunctionDef3
            Invoke-Expression $FunctionDef4
            
            if (Test-HostAlive -IPAddress $IPAddress) {
                return Discover-DeviceSnmp -IPAddress $IPAddress
            }
            return $null
        } -ArgumentList $ip, 
            ${function:Test-HostAlive}.ToString(), 
            ${function:Get-OpenPorts}.ToString(),
            ${function:Get-DeviceFingerprint}.ToString(),
            ${function:Discover-DeviceSnmp}.ToString()
    }
    
    # Wait for all jobs and collect results
    foreach ($job in $jobs) {
        $result = Wait-Job -Job $job | Receive-Job
        Remove-Job -Job $job
        
        if ($result) {
            $script:ResultsLock.WaitOne() | Out-Null
            [void]$script:DiscoveredDevices.Add($result)
            $script:ResultsLock.ReleaseMutex()
            
            Write-Host "Found: $($result.ipAddress) - $($result.status)" -ForegroundColor Green
        }
    }
}

# Function to send results to server
function Send-Results {
    param([array]$Devices)
    
    if ($Devices.Count -eq 0) {
        return
    }
    
    $body = @{
        token = $Token
        devices = $Devices
    } | ConvertTo-Json -Depth 10
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$ServerUrl/api/discovery/jobs/$JobId/results" `
            -Method POST `
            -Body $body `
            -Headers $headers `
            -TimeoutSec 30
        
        Write-Host "Sent $($Devices.Count) devices to server" -ForegroundColor Green
        return $response
    } catch {
        Write-Host "Failed to send results: $_" -ForegroundColor Red
        return $null
    }
}

# Main execution
function Start-Discovery {
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "  ITAM Network Discovery Scanner - Windows" -ForegroundColor Cyan
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ([string]::IsNullOrEmpty($JobId) -or [string]::IsNullOrEmpty($Token)) {
        Write-Host "ERROR: JobId and Token are required!" -ForegroundColor Red
        Write-Host "Usage: .\itam-discovery.ps1 -JobId <jobid> -Token <token> -ServerUrl <url>" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "Job ID: $JobId" -ForegroundColor White
    Write-Host "Server: $ServerUrl" -ForegroundColor White
    Write-Host ""
    
    # Check SNMP tools
    if (-not (Test-SnmpAvailable)) {
        Write-Host "WARNING: SNMP queries will be limited without Net-SNMP tools" -ForegroundColor Yellow
        Write-Host "Port scanning and fingerprinting will still work" -ForegroundColor Yellow
        Write-Host ""
    }
    
    # Get network ranges
    $ranges = Get-LocalNetworkRange -ManualCIDR $Cidr -ManualInterface $Interface
    Write-Host "Detected $($ranges.Count) network range(s)" -ForegroundColor White
    Write-Host ""
    
    # Scan each range
    foreach ($range in $ranges) {
        Scan-NetworkRange -Range $range
        
        # Send results in batches
        if ($script:DiscoveredDevices.Count -ge $BatchSize) {
            $batch = $script:DiscoveredDevices[0..($BatchSize-1)]
            Send-Results -Devices $batch
            $script:DiscoveredDevices.RemoveRange(0, $BatchSize)
        }
    }
    
    # Send remaining results
    if ($script:DiscoveredDevices.Count -gt 0) {
        Send-Results -Devices $script:DiscoveredDevices
    }
    
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "Discovery completed!" -ForegroundColor Green
    Write-Host "Check the web interface for results" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Cyan
    
    # Keep window open
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Start discovery
Start-Discovery
