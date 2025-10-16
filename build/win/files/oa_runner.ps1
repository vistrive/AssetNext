<# 
  oa_runner.ps1 — Windows XML audit -> Open-AudIT
  - Compatible with Windows PowerShell 5.1 and PowerShell 7+
  - Uses Get-CimInstance (no deprecated Get-WmiObject)
  - Mirrors macOS XML shape; POSTs as form field "data"
  - Defensive: try/catch everywhere; runs even if some data is missing
#>

# Be tolerant on PS 5.1
try { Set-StrictMode -Version 2.0 } catch {}
$ErrorActionPreference = 'Continue'
$ProgressPreference    = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor 3072 } catch {}

# ---------------- Configuration ----------------
# Open-AudIT endpoint (same as mac)
$url           = "https://open-audit.vistrivetech.com/index.php/input/devices"
$submit_online = "y"   # "y" or "n"
$create_file   = "n"   # "y" = save XML to $BaseDir
$discovery_id  = ""
$org_id        = ""
$terminal_print= "n"
$debugging     = "1"   # 0..3
$system_id     = ""
$last_seen_by  = "audit"
$version       = "5.6.5-win-full"

# Where to save artifacts if enabled
$BaseDir = 'C:\ProgramData\ITAM'
try { if (-not (Test-Path $BaseDir)) { New-Item -ItemType Directory -Path $BaseDir -Force | Out-Null } } catch {}

# ---------------- Helpers ----------------
function Log([string]$m){ if([int]$debugging -gt 0){ Write-Host $m } }
function TryCim([string]$cls,[string]$ns='root\cimv2',[string]$filter=$null){
  try{
    if($filter){ Get-CimInstance -ClassName $cls -Namespace $ns -Filter $filter -ErrorAction Stop }
    else{ Get-CimInstance -ClassName $cls -Namespace $ns -ErrorAction Stop }
  }catch{ $null }
}
function DmtfToStr($d){
  try{
    if([string]::IsNullOrWhiteSpace($d)){ return "" }
    [System.Management.ManagementDateTimeConverter]::ToDateTime($d).ToString("yyyy-MM-dd HH:mm:ss")
  }catch{ "" }
}
function ToMB([nullable[int64]]$bytes) {
  if ($bytes -and $bytes -gt 0) { return [int]([math]::Floor($bytes/1MB)) } else { return 0 }
}

# Working names/paths
$system_hostname     = $env:COMPUTERNAME
$xml_file            = ("{0}-{1}.xml" -f $system_hostname, (Get-Date -Format "yyyyMMddHHmmss"))
$xml_file_full_path  = Join-Path $BaseDir $xml_file

# ---------------- Collect: System ----------------
if([int]$debugging -gt 0){
  Write-Host "----------------------------"
  Write-Host "Open-AudIT Windows audit script"
  Write-Host "Version: $version"
  Write-Host "----------------------------"
  Write-Host "My PID is           $PID"
  Write-Host "Create File         $create_file"
  Write-Host "Submit Online       $submit_online"
  Write-Host "Debugging Level     $debugging"
  Write-Host "Discovery ID        $discovery_id"
  Write-Host "Org Id              $org_id"
  Write-Host "File                $xml_file_full_path"
  Write-Host "----------------------------"
}

Log "System Info"
$system_timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")

$os   = TryCim 'Win32_OperatingSystem'
$cs   = TryCim 'Win32_ComputerSystem'
$csp  = TryCim 'Win32_ComputerSystemProduct'
$bios = TryCim 'Win32_BIOS'

$system_uuid          = if ($csp) { $csp.UUID } else { $null }
$system_domain        = if ($cs -and $cs.Domain -and $cs.Domain -ne 'WORKGROUP'){ $cs.Domain } else { "" }
$system_os_name       = if ($os) { $os.Caption } else { $null }
$system_os_version    = if ($os) { $os.Version } else { $null }
$system_serial        = if ($csp){ $csp.IdentifyingNumber } else { $null }
$system_model         = if ($cs) { $cs.Model } else { $null }
$system_manufacturer  = if ($cs) { $cs.Manufacturer } else { $null }
$system_os_arch       = if ($os) { $os.OSArchitecture } else { $null }
$system_pc_os_bit     = if($system_os_arch -and $system_os_arch -like "*64*"){ "64" } else { "32" }
$system_pc_memory     = 0
foreach($m in (TryCim 'Win32_PhysicalMemory')){ $system_pc_memory += [int]([math]::Round($m.Capacity/1MB,0)) } # MB
$processor_count      = if ($cs) { $cs.NumberOfProcessors } else { $null }
$system_pc_date_os_installation = if ($os) { DmtfToStr $os.InstallDate } else { "" }

# First IPv4 on an enabled NIC
$system_ip = $null
$ipEnabled = TryCim 'Win32_NetworkAdapterConfiguration' | Where-Object { $_.IPEnabled -and $_.IPAddress }
foreach($n in $ipEnabled){
  $v4 = $n.IPAddress | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1
  if($v4){ $system_ip = $v4; break }
}

# ---------------- Build XML ----------------
$sb = New-Object System.Text.StringBuilder
$w  = New-Object System.IO.StringWriter($sb)

# header
$w.WriteLine('<?xml version="1.0" encoding="UTF-8"?>')
$w.WriteLine('<system>')
$w.WriteLine('  <sys>')
$w.WriteLine("      <script_version>$version</script_version>")
$w.WriteLine("      <timestamp>$system_timestamp</timestamp>")
$w.WriteLine("      <id>$system_id</id>")
$w.WriteLine("      <uuid>$system_uuid</uuid>")
$w.WriteLine("      <hostname>$system_hostname</hostname>")
$w.WriteLine("      <domain>$system_domain</domain>")
$w.WriteLine("      <description></description>")
$w.WriteLine("      <ip>$system_ip</ip>")
$w.WriteLine("      <class></class>")
$w.WriteLine("      <type>computer</type>")
$w.WriteLine("      <os_group>Windows</os_group>")
# simple family guess
$os_family = ""
if($system_os_name -and $system_os_name -like "*Server*"){ $os_family = "Windows Server" }
elseif($system_os_name -and $system_os_name -like "*Windows 11*"){ $os_family = "Windows 11" }
elseif($system_os_name -and $system_os_name -like "*Windows 10*"){ $os_family = "Windows 10" }
$w.WriteLine("      <os_family>$os_family</os_family>")
$w.WriteLine("      <os_name>$system_os_name</os_name>")
$w.WriteLine("      <os_version>$system_os_version</os_version>")
$w.WriteLine("      <serial>$system_serial</serial>")
$w.WriteLine("      <model>$system_model</model>")
$w.WriteLine("      <manufacturer>$system_manufacturer</manufacturer>")
$w.WriteLine("      <manufacturer_code></manufacturer_code>")
$w.WriteLine("      <uptime></uptime>")
$w.WriteLine("      <form_factor></form_factor>")
$w.WriteLine("      <os_bit>$system_pc_os_bit</os_bit>")
$w.WriteLine("      <os_arch>$system_os_arch</os_arch>")
$w.WriteLine("      <memory_count>$system_pc_memory</memory_count>")
$w.WriteLine("      <processor_count>$processor_count</processor_count>")
$w.WriteLine("      <os_installation_date>$system_pc_date_os_installation</os_installation_date>")
$w.WriteLine("      <org_id>$org_id</org_id>")
$w.WriteLine("      <last_seen_by>$last_seen_by</last_seen_by>")
$w.WriteLine("      <discovery_id>$discovery_id</discovery_id>")
$w.WriteLine('  </sys>')

# ---------------- Network ----------------
Log "Network Cards Info"
$w.WriteLine('  <network>')
try {
  # Join via Index (NetAdapter.Index <-> NetAdapterConfiguration.Index)
  $adapters = TryCim 'Win32_NetworkAdapter' | Where-Object { $_.PhysicalAdapter }
  $cfgs     = TryCim 'Win32_NetworkAdapterConfiguration'
  foreach($n in $adapters) {
    $p = $cfgs | Where-Object { $_.Index -eq $n.Index } | Select-Object -First 1
    $mac = if ($p) { $p.MACAddress } else { $null }
    if($mac){
      $net_index        = "$($n.InterfaceIndex)"
      $net_manufacturer = "$($n.Manufacturer)"
      $net_model        = "$($n.Name)"
      $net_description  = "$($n.Description)"
      $ip_enabled       = if($p -and $p.IPEnabled){ "True" } else { "False" }
      $net_connection   = "$($n.NetConnectionID)"
      $conn_status      = "$($n.NetConnectionStatus)"
      $net_type         = "$($n.AdapterType)"

      $w.WriteLine('      <item>')
      $w.WriteLine("          <net_index>$net_index</net_index>")
      $w.WriteLine("          <mac>$mac</mac>")
      $w.WriteLine("          <manufacturer>$net_manufacturer</manufacturer>")
      $w.WriteLine("          <model>$net_model</model>")
      $w.WriteLine("          <description>$net_description</description>")
      $w.WriteLine("          <ip_enabled>$ip_enabled</ip_enabled>")
      $w.WriteLine("          <connection>$net_connection</connection>")
      $w.WriteLine("          <connection_status>$conn_status</connection_status>")
      $w.WriteLine("          <type>$net_type</type>")
      $w.WriteLine('      </item>')
    }
  }
} catch {}
$w.WriteLine('  </network>')

$w.WriteLine('  <ip>')
try {
  foreach($p in ($cfgs | Where-Object { $_.IPEnabled -and $_.IPAddress })) {
    $mac = $p.MACAddress
    if(-not $mac){ continue }
    # IPv4
    $ipv4 = $p.IPAddress | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' }
    foreach($ip4 in $ipv4){
      $mask = $p.IPSubnet | Where-Object { $_ -match '^\d{1,3}(\.\d{1,3}){3}$' } | Select-Object -First 1
      $w.WriteLine('      <item>')
      $w.WriteLine("          <net_index>$($p.InterfaceIndex)</net_index>")
      $w.WriteLine("          <mac>$mac</mac>")
      $w.WriteLine("          <ip>$ip4</ip>")
      $w.WriteLine("          <netmask>$mask</netmask>")
      $w.WriteLine("          <version>4</version>")
      $w.WriteLine('      </item>')
    }
    # IPv6
    $ipv6 = $p.IPAddress | Where-Object { $_ -match ':' }
    foreach($ip6 in $ipv6){
      $w.WriteLine('      <item>')
      $w.WriteLine("          <net_index>$($p.InterfaceIndex)</net_index>")
      $w.WriteLine("          <mac>$mac</mac>")
      $w.WriteLine("          <ip>$ip6</ip>")
      $w.WriteLine("          <netmask></netmask>")
      $w.WriteLine("          <version>6</version>")
      $w.WriteLine('      </item>')
    }
  }
} catch {}
$w.WriteLine('  </ip>')

# ---------------- Processor ----------------
$cpu = TryCim 'Win32_Processor' | Select-Object -First 1
$cpu_desc = if ($cpu) { $cpu.Name } else { $null }
$cpu_man  = if ($cpu) { $cpu.Manufacturer } else { $null }
$cpu_speed= if ($cpu) { $cpu.MaxClockSpeed } else { $null }   # MHz
$cpu_cores= if ($cpu) { $cpu.NumberOfCores } else { $null }
$cpu_logi = if ($cpu) { $cpu.NumberOfLogicalProcessors } else { $null }

$w.WriteLine('  <processor>')
$w.WriteLine('      <item>')
$w.WriteLine("          <physical_count>$processor_count</physical_count>")
$w.WriteLine("          <core_count>$cpu_cores</core_count>")
$w.WriteLine("          <logical_count>$cpu_logi</logical_count>")
$w.WriteLine("          <socket></socket>")
$w.WriteLine("          <description>$cpu_desc</description>")
$w.WriteLine("          <speed>$cpu_speed</speed>")
$w.WriteLine("          <manufacturer>$cpu_man</manufacturer>")
$w.WriteLine("          <architecture>$system_os_arch</architecture>")
$w.WriteLine('      </item>')
$w.WriteLine('  </processor>')

# ---------------- Memory ----------------
$w.WriteLine('  <memory>')
try {
  $dimms = TryCim 'Win32_PhysicalMemory'
  $slot = 0
  foreach ($d in $dimms) {
    $slot++
    $bank        = if ($d.BankLabel) { $d.BankLabel } elseif ($d.DeviceLocator) { $d.DeviceLocator } else { "$slot" }
    $formFactor  = $d.FormFactor
    $detail      = $d.MemoryType
    $type        = $d.SMBIOSMemoryType
    $speed       = $d.Speed
    $serial      = $d.SerialNumber
    $part        = $d.PartNumber
    $sizeMB      = [int]([math]::Round(($d.Capacity/1MB),0))

    $w.WriteLine('      <item>')
    $w.WriteLine("          <bank>$bank</bank>")
    $w.WriteLine("          <type>$type</type>")
    $w.WriteLine("          <form_factor>$formFactor</form_factor>")
    $w.WriteLine("          <detail>$detail</detail>")
    $w.WriteLine("          <size>$sizeMB</size>")
    $w.WriteLine("          <speed>$speed</speed>")
    $w.WriteLine("          <tag>$part</tag>")
    $w.WriteLine("          <serial>$serial</serial>")
    $w.WriteLine('      </item>')
  }
} catch {}
$w.WriteLine('  </memory>')

# ---------------- Disks + Partitions ----------------
$w.WriteLine('  <disk>')
$partitionXml = New-Object System.Text.StringBuilder

try {
  $drives   = TryCim 'Win32_DiskDrive'
  $parts    = TryCim 'Win32_DiskPartition'
  $logical  = TryCim 'Win32_LogicalDisk'
  $d2p      = TryCim 'Win32_DiskDriveToDiskPartition'
  $p2l      = TryCim 'Win32_LogicalDiskToPartition'

  foreach ($d in $drives) {
    $idx    = $d.Index
    $iface  = $d.InterfaceType
    $model  = $d.Model
    $man    = $d.Manufacturer
    $serial = $d.SerialNumber
    $sizeMB = ToMB $d.Size
    $dev    = $d.DeviceID
    $firm   = $d.FirmwareRevision
    $status = $d.Status
    $caption= $model

    $w.WriteLine('      <item>')
    $w.WriteLine("          <caption>$caption</caption>")
    $w.WriteLine("          <hard_drive_index>$idx</hard_drive_index>")
    $w.WriteLine("          <interface_type>$iface</interface_type>")
    $w.WriteLine("          <manufacturer>$man</manufacturer>")
    $w.WriteLine("          <model>$model</model>")
    $w.WriteLine("          <serial>$serial</serial>")
    $w.WriteLine("          <size>$sizeMB</size>")
    $w.WriteLine("          <device>$dev</device>")
    $w.WriteLine("          <status>$status</status>")
    $w.WriteLine("          <firmware>$firm</firmware>")
    $w.WriteLine('      </item>')

    # partitions for this disk
    $diskWmiId = $d.DeviceID.Replace('\','\\')
    foreach ($link in $d2p) {
      $ant = "$($link.Antecedent)"
      $dep = "$($link.Dependent)"
      if ($ant -like "*DeviceID=`"$diskWmiId`"*") {
        if ($dep -match 'Win32_DiskPartition\.DeviceID="([^"]+)"') {
          $pid = $matches[1]
          $pObj = $parts | Where-Object { $_.DeviceID -eq $pid }
          if (-not $pObj) { continue }

          # find logical disks (mount points) for this partition
          $mountPoints = @()
          foreach ($l2 in $p2l) {
            $a2 = "$($l2.Antecedent)"; $d2 = "$($l2.Dependent)"
            if ($a2 -like "*DeviceID=`"$pid`"*") {
              if ($d2 -match 'Win32_LogicalDisk\.DeviceID="([^"]+)"') {
                $ldid = $matches[1]
                $ldo  = $logical | Where-Object { $_.DeviceID -eq $ldid }
                if ($ldo) { $mountPoints += $ldo }
              }
            }
          }

          if ($mountPoints.Count -eq 0) { $mountPoints = @($null) }

          foreach ($ld in $mountPoints) {
            $mpath   = if ($ld) { $ld.DeviceID } else { '' }
            $format  = if ($ld) { $ld.FileSystem } else { '' }
            $totalMB = if ($ld) { ToMB $ld.Size } else { ToMB $pObj.Size }
            $freeMB  = if ($ld) { ToMB $ld.FreeSpace } else { 0 }
            $usedMB  = if ($totalMB -gt 0) { $totalMB - $freeMB } else { 0 }
            $name    = if ($ld) { $ld.VolumeName } else { $pObj.Name }
            $serialP = if ($ld) { $ld.VolumeSerialNumber } else { '' }
            $ptype   = 'local'
            $mntType = 'partition'
            $desc    = $name
            $pDiskIx = $pObj.DiskIndex

            $null = $partitionXml.AppendLine('      <item>')
            $null = $partitionXml.AppendLine("          <serial>$serialP</serial>")
            $null = $partitionXml.AppendLine("          <hard_drive_index>$idx</hard_drive_index>")
            $null = $partitionXml.AppendLine("          <mount_type>$mntType</mount_type>")
            $null = $partitionXml.AppendLine("          <mount_point><![CDATA[$mpath]]></mount_point>")
            $null = $partitionXml.AppendLine("          <name>$name</name>")
            $null = $partitionXml.AppendLine("          <size>$totalMB</size>")
            $null = $partitionXml.AppendLine("          <free>$freeMB</free>")
            $null = $partitionXml.AppendLine("          <used>$usedMB</used>")
            $null = $partitionXml.AppendLine("          <format>$format</format>")
            $null = $partitionXml.AppendLine("          <description>$desc</description>")
            $null = $partitionXml.AppendLine("          <device>$dev</device>")
            $null = $partitionXml.AppendLine("          <partition_disk_index>$pDiskIx</partition_disk_index>")
            $null = $partitionXml.AppendLine("          <bootable></bootable>")
            $null = $partitionXml.AppendLine("          <type>$ptype</type>")
            $null = $partitionXml.AppendLine('      </item>')
          }
        }
      }
    }
  }
} catch {}
$w.WriteLine('  </disk>')
$w.WriteLine('  <partition>')
$w.WriteLine($partitionXml.ToString())
$w.WriteLine('  </partition>')

# ---------------- Software ----------------
$w.WriteLine('  <software>')
try {
  if ($system_os_name -or $system_os_version) {
    $w.WriteLine('      <item>')
    $w.WriteLine("          <name><![CDATA[$system_os_name]]></name>")
    $w.WriteLine("          <version><![CDATA[$system_os_version]]></version>")
    $w.WriteLine("          <publisher><![CDATA[Microsoft]]></publisher>")
    $w.WriteLine('      </item>')
  }
  $roots = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
  )
  foreach ($r in $roots) {
    try {
      Get-ItemProperty -Path $r -ErrorAction Stop | ForEach-Object {
        if ($_.DisplayName) {
          $name   = $_.DisplayName
          $ver    = $_.DisplayVersion
          $pub    = $_.Publisher
          $loc    = $_.InstallLocation
          $source = $_.InstallSource

          $w.WriteLine('      <item>')
          $w.WriteLine("          <name><![CDATA[$name]]></name>")
          $w.WriteLine("          <version><![CDATA[$ver]]></version>")
          if ($loc)    { $w.WriteLine("          <location><![CDATA[$loc]]></location>") }
          if ($source) { $w.WriteLine("          <install_source><![CDATA[$source]]></install_source>") }
          if ($pub)    { $w.WriteLine("          <publisher><![CDATA[$pub]]></publisher>") }
          $w.WriteLine('      </item>')
        }
      }
    } catch {}
  }
} catch {}
$w.WriteLine('  </software>')

# ---------------- Close XML ----------------
$w.WriteLine('</system>')
$w.Flush()
$xml = $sb.ToString()

# ---------------- Output / Submit ----------------
try {
  if($create_file -eq "y"){
    Set-Content -LiteralPath $xml_file_full_path -Value $xml -Encoding UTF8 -Force
  }
  if($terminal_print -eq "y"){ $xml | Out-Host }

  if($submit_online -eq "y"){
    Log "Submitting results to server"
    try{
      $body = @{ data = $xml }
      Invoke-WebRequest -Uri $url -Method POST -Body $body -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing | Out-Null
    }catch{
      if([int]$debugging -gt 0){ Write-Host "POST failed: $($_.Exception.Message)" }
    }
  }
}catch{}

if([int]$debugging -gt 0){ Write-Host "Audit Completed" }
exit 0
