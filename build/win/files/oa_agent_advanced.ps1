# Advanced Windows Agent Script for Open-AudIT
# Collects hardware, software, system, and config info, then posts to Open-AudIT

$ErrorActionPreference = 'Stop'

# === CONFIGURE THESE ===
$OaUrl = 'https://open-audit.vistrivetech.com/index.php/input/devices'  # <- your OA endpoint

# === Collect Device Info ===
$DeviceInfo = @{}

# Hardware Info
$DeviceInfo['ComputerSystem'] = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object *
$DeviceInfo['Processor'] = Get-CimInstance -ClassName Win32_Processor | Select-Object *
$DeviceInfo['Memory'] = Get-CimInstance -ClassName Win32_PhysicalMemory | Select-Object *
$DeviceInfo['DiskDrives'] = Get-CimInstance -ClassName Win32_DiskDrive | Select-Object *
$DeviceInfo['BIOS'] = Get-CimInstance -ClassName Win32_BIOS | Select-Object *
$DeviceInfo['Motherboard'] = Get-CimInstance -ClassName Win32_BaseBoard | Select-Object *

# Software Info
$DeviceInfo['InstalledApps'] = Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate
$DeviceInfo['InstalledApps64'] = Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Select-Object DisplayName, DisplayVersion, Publisher, InstallDate

# System Info
$DeviceInfo['OS'] = Get-CimInstance -ClassName Win32_OperatingSystem | Select-Object *
$DeviceInfo['NetworkAdapters'] = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled } | Select-Object *
$DeviceInfo['UserAccounts'] = Get-CimInstance -ClassName Win32_UserAccount | Select-Object *
$DeviceInfo['Services'] = Get-Service | Select-Object *

# Configuration Info
$DeviceInfo['EnvironmentVariables'] = Get-ChildItem Env:
$DeviceInfo['StartupPrograms'] = Get-CimInstance -ClassName Win32_StartupCommand | Select-Object *
$DeviceInfo['ScheduledTasks'] = Get-ScheduledTask | Select-Object *

function Log([string]$m){
    try{
        $base = "C:\ProgramData\ITAM"
        if(!(Test-Path $base)){ New-Item -ItemType Directory -Path $base -Force | Out-Null }
        "$([datetime]::UtcNow.ToString('o')) $m" | Out-File -FilePath (Join-Path $base 'oa_agent.log') -Append -Encoding utf8
    } catch {}
}

function XmlEscape([string]$s){
    if($null -eq $s){ return "" }
    return [System.Security.SecurityElement]::Escape([string]$s)
}

# Helper: join multi-values into safe xml
function SafeJoin([object]$val){
    if($null -eq $val){ return "" }
    if($val -is [array]){ return XmlEscape(($val -join ", ")) }
    return XmlEscape($val)
}

# Build a rich Open-AudIT XML payload
try{
    $hostname = XmlEscape((($DeviceInfo['ComputerSystem'].Name) -as [string]) -replace '[^\w\.-]', '_')
} catch {
    $hostname = XmlEscape((Get-ComputerInfo -Property CsName).CsName 2>$null)
}

try { $serial = XmlEscape(($DeviceInfo['BIOS'].SerialNumber) -as [string]) } catch { $serial = "" }
try { $model = XmlEscape(($DeviceInfo['ComputerSystem'].Model) -as [string]) } catch { $model = "" }
try { $manufacturer = XmlEscape(($DeviceInfo['ComputerSystem'].Manufacturer) -as [string]) } catch { $manufacturer = "" }
try { $os = XmlEscape(($DeviceInfo['OS'].Caption) -as [string]) } catch { $os = "Windows" }
try { $osver = XmlEscape(($DeviceInfo['OS'].Version) -as [string]) } catch { $osver = "" }

# Choose primary IP and mac
$ip = ""
$mac = ""
try{
    $n = $DeviceInfo['NetworkAdapters'] | Where-Object { $_.IPAddress -and ($_.IPAddress -is [array]) -and $_.MACAddress } | Select-Object -First 1
    if($n -and $n.IPAddress){ $ip = XmlEscape($n.IPAddress[0]) }
    if($n -and $n.MACAddress){ $mac = XmlEscape($n.MACAddress) }
} catch {}

Log "Preparing rich OA XML for $hostname (serial=$serial)"

$sb = New-Object System.Text.StringBuilder
$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>') | Out-Null
$sb.AppendLine('<system>') | Out-Null
$sb.AppendLine('  <sys>') | Out-Null
$sb.AppendLine("    <script_version>oa_agent_advanced</script_version>") | Out-Null
$sb.AppendLine("    <timestamp>$([datetime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss'))</timestamp>") | Out-Null
$sb.AppendLine("    <hostname>$hostname</hostname>") | Out-Null
$sb.AppendLine("    <ip>$ip</ip>") | Out-Null
$sb.AppendLine("    <mac>$mac</mac>") | Out-Null
$sb.AppendLine("    <type>computer</type>") | Out-Null
$sb.AppendLine("    <os_name>$os</os_name>") | Out-Null
$sb.AppendLine("    <os_version>$osver</os_version>") | Out-Null
$sb.AppendLine("    <serial>$serial</serial>") | Out-Null
$sb.AppendLine("    <model>$model</model>") | Out-Null
$sb.AppendLine("    <manufacturer>$manufacturer</manufacturer>") | Out-Null

    # Hardware: processors
try{
    $procs = $DeviceInfo['Processor']
    if($procs){
        $sb.AppendLine('    <processors>') | Out-Null
        foreach($p in $procs){
            $sb.AppendLine('      <processor>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($p.Name))</name>") | Out-Null
            $sb.AppendLine("        <manufacturer>$(XmlEscape($p.Manufacturer))</manufacturer>") | Out-Null
            $sb.AppendLine("        <cores>$(XmlEscape($p.NumberOfCores))</cores>") | Out-Null
            $sb.AppendLine("        <logical_processors>$(XmlEscape($p.NumberOfLogicalProcessors))</logical_processors>") | Out-Null
            $sb.AppendLine('      </processor>') | Out-Null
        }
        $sb.AppendLine('    </processors>') | Out-Null
    }
} catch {}

# Memory modules
try{
    $mems = $DeviceInfo['Memory']
    if($mems){
        $sb.AppendLine('    <memory>') | Out-Null
        foreach($m in $mems){
            $sb.AppendLine('      <module>') | Out-Null
            $sb.AppendLine("        <capacity>$(XmlEscape($m.Capacity))</capacity>") | Out-Null
            $sb.AppendLine("        <speed>$(XmlEscape($m.Speed))</speed>") | Out-Null
            $sb.AppendLine("        <manufacturer>$(XmlEscape($m.Manufacturer))</manufacturer>") | Out-Null
            $sb.AppendLine('      </module>') | Out-Null
        }
        $sb.AppendLine('    </memory>') | Out-Null
    }
} catch {}

# Disk drives and logical volumes
try{
    $disks = Get-CimInstance -ClassName Win32_DiskDrive
    if($disks){
        $sb.AppendLine('    <disk_drives>') | Out-Null
        foreach($d in $disks){
            $sb.AppendLine('      <disk>') | Out-Null
            $sb.AppendLine("        <model>$(XmlEscape($d.Model))</model>") | Out-Null
            $sb.AppendLine("        <serial>$(XmlEscape($d.SerialNumber))</serial>") | Out-Null
            $sb.AppendLine("        <size>$(XmlEscape($d.Size))</size>") | Out-Null
            $sb.AppendLine('      </disk>') | Out-Null
        }
        $sb.AppendLine('    </disk_drives>') | Out-Null
    }
} catch {}

# Logical volumes
try{
    $vols = Get-CimInstance -ClassName Win32_LogicalDisk | Where-Object { $_.DriveType -in 2,3 }
    if($vols){
        $sb.AppendLine('    <volumes>') | Out-Null
        foreach($v in $vols){
            $sb.AppendLine('      <volume>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($v.DeviceID))</name>") | Out-Null
            $sb.AppendLine("        <filesystem>$(XmlEscape($v.FileSystem))</filesystem>") | Out-Null
            $sb.AppendLine("        <capacity>$(XmlEscape($v.Size))</capacity>") | Out-Null
            $sb.AppendLine("        <free>$(XmlEscape($v.FreeSpace))</free>") | Out-Null
            $sb.AppendLine('      </volume>') | Out-Null
        }
        $sb.AppendLine('    </volumes>') | Out-Null
    }
} catch {}

# Installed software (both registry hives)
try{
    $sb.AppendLine('    <software>') | Out-Null
    $apps = @()
    try{ $apps += Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue } catch {}
    try{ $apps += Get-ItemProperty HKLM:\Software\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* -ErrorAction SilentlyContinue } catch {}
    $apps = $apps | Where-Object { $_.DisplayName } | Sort-Object DisplayName -Unique
    foreach($a in $apps){
        $sb.AppendLine('      <package>') | Out-Null
        $sb.AppendLine("        <name>$(XmlEscape($a.DisplayName))</name>") | Out-Null
        $sb.AppendLine("        <version>$(XmlEscape($a.DisplayVersion))</version>") | Out-Null
        $sb.AppendLine("        <publisher>$(XmlEscape($a.Publisher))</publisher>") | Out-Null
        $sb.AppendLine('      </package>') | Out-Null
    }
    $sb.AppendLine('    </software>') | Out-Null
} catch {}

# Windows hotfixes and updates
try{
    $hotfixes = Get-HotFix -ErrorAction SilentlyContinue
    if($hotfixes){
        $sb.AppendLine('    <hotfixes>') | Out-Null
        foreach($h in $hotfixes){
            $sb.AppendLine('      <hotfix>') | Out-Null
            $sb.AppendLine("        <id>$(XmlEscape($h.HotFixID))</id>") | Out-Null
            $sb.AppendLine("        <installed>$(XmlEscape($h.InstalledOn))</installed>") | Out-Null
            $sb.AppendLine('      </hotfix>') | Out-Null
        }
        $sb.AppendLine('    </hotfixes>') | Out-Null
    }
} catch {}

# Network interfaces
try{
    $nics = Get-CimInstance -ClassName Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled }
    if($nics){
        $sb.AppendLine('    <network>') | Out-Null
        foreach($nic in $nics){
            $sb.AppendLine('      <interface>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($nic.Description))</name>") | Out-Null
            $sb.AppendLine("        <mac>$(XmlEscape($nic.MACAddress))</mac>") | Out-Null
            $sb.AppendLine("        <ip>$(SafeJoin($nic.IPAddress))</ip>") | Out-Null
            $sb.AppendLine("        <dns>$(SafeJoin($nic.DNSServerSearchOrder))</dns>") | Out-Null
            $sb.AppendLine('      </interface>') | Out-Null
        }
        $sb.AppendLine('    </network>') | Out-Null
    }
} catch {}

# Users
try{
    $users = Get-CimInstance -ClassName Win32_UserAccount | Where-Object { $_.LocalAccount -eq $true }
    if($users){
        $sb.AppendLine('    <users>') | Out-Null
        foreach($u in $users){
            $sb.AppendLine('      <user>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($u.Name))</name>") | Out-Null
            $sb.AppendLine("        <fullname>$(XmlEscape($u.FullName))</fullname>") | Out-Null
            $sb.AppendLine('      </user>') | Out-Null
        }
        $sb.AppendLine('    </users>') | Out-Null
    }
} catch {}

# Services (summary)
try{
    $svcs = Get-Service | Where-Object { $_.Status -ne $null }
    if($svcs){
        $sb.AppendLine('    <services>') | Out-Null
        foreach($s in $svcs){
            $sb.AppendLine('      <service>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($s.Name))</name>") | Out-Null
            $sb.AppendLine("        <display>$(XmlEscape($s.DisplayName))</display>") | Out-Null
            $sb.AppendLine("        <status>$(XmlEscape($s.Status))</status>") | Out-Null
            $sb.AppendLine('      </service>') | Out-Null
        }
        $sb.AppendLine('    </services>') | Out-Null
    }
} catch {}

# Scheduled tasks
try{
    $tasks = Get-ScheduledTask -ErrorAction SilentlyContinue
    if($tasks){
        $sb.AppendLine('    <scheduled_tasks>') | Out-Null
        foreach($t in $tasks){
            $sb.AppendLine('      <task>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($t.TaskName))</name>") | Out-Null
            $sb.AppendLine('      </task>') | Out-Null
        }
        $sb.AppendLine('    </scheduled_tasks>') | Out-Null
    }
} catch {}

# Startup programs
try{
    $startup = Get-CimInstance -ClassName Win32_StartupCommand -ErrorAction SilentlyContinue
    if($startup){
        $sb.AppendLine('    <startup>') | Out-Null
        foreach($s in $startup){
            $sb.AppendLine('      <startup_item>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($s.Name))</name>") | Out-Null
            $sb.AppendLine("        <command>$(XmlEscape($s.Command))</command>") | Out-Null
            $sb.AppendLine('      </startup_item>') | Out-Null
        }
        $sb.AppendLine('    </startup>') | Out-Null
    }
} catch {}

# Additional details: video, drivers, printers, processes, system identifiers, TPM, BitLocker, firewall, locale
try{
    # Video controllers / GPUs
    $vcs = Get-CimInstance -ClassName Win32_VideoController -ErrorAction SilentlyContinue
    if($vcs){
        $sb.AppendLine('    <video_controllers>') | Out-Null
        foreach($vc in $vcs){
            $sb.AppendLine('      <video>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($vc.Name))</name>") | Out-Null
            $sb.AppendLine("        <driver>$(XmlEscape($vc.DriverVersion))</driver>") | Out-Null
            $sb.AppendLine("        <memory>$(XmlEscape($vc.AdapterRAM))</memory>") | Out-Null
            $sb.AppendLine('      </video>') | Out-Null
        }
        $sb.AppendLine('    </video_controllers>') | Out-Null
    }
} catch {}

try{
    # Signed drivers (limit to first 200 to avoid enormous payloads)
    $drs = Get-CimInstance -ClassName Win32_PnPSignedDriver -ErrorAction SilentlyContinue | Select-Object -First 200
    if($drs){
        $sb.AppendLine('    <drivers>') | Out-Null
        foreach($d in $drs){
            $sb.AppendLine('      <driver>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($d.DeviceName))</name>") | Out-Null
            $sb.AppendLine("        <provider>$(XmlEscape($d.DriverProviderName))</provider>") | Out-Null
            $sb.AppendLine("        <version>$(XmlEscape($d.DriverVersion))</version>") | Out-Null
            $sb.AppendLine('      </driver>') | Out-Null
        }
        $sb.AppendLine('    </drivers>') | Out-Null
    }
} catch {}

try{
    # Printers
    $printers = Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue
    if($printers){
        $sb.AppendLine('    <printers>') | Out-Null
        foreach($p in $printers){
            $sb.AppendLine('      <printer>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($p.Name))</name>") | Out-Null
            $sb.AppendLine("        <driver>$(XmlEscape($p.DriverName))</driver>") | Out-Null
            $sb.AppendLine('      </printer>') | Out-Null
        }
        $sb.AppendLine('    </printers>') | Out-Null
    }
} catch {}

try{
    # Running processes (limit to 200)
    $procs = Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First 200
    if($procs){
        $sb.AppendLine('    <processes>') | Out-Null
        foreach($p in $procs){
            $path = ""
            try{ $path = (Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)").ExecutablePath } catch {}
            $sb.AppendLine('      <process>') | Out-Null
            $sb.AppendLine("        <name>$(XmlEscape($p.ProcessName))</name>") | Out-Null
            $sb.AppendLine("        <pid>$(XmlEscape($p.Id))</pid>") | Out-Null
            $sb.AppendLine("        <path>$(XmlEscape($path))</path>") | Out-Null
            $sb.AppendLine('      </process>') | Out-Null
        }
        $sb.AppendLine('    </processes>') | Out-Null
    }
} catch {}

try{
    # System identifiers
    $csprod = Get-CimInstance -ClassName Win32_ComputerSystemProduct -ErrorAction SilentlyContinue
    if($csprod){ $sb.AppendLine("    <uuid>$(XmlEscape($csprod.UUID))</uuid>") | Out-Null }
    $domain = ""
    try{ $domain = XmlEscape($DeviceInfo['ComputerSystem'].Domain) } catch {}
    if($domain -and $domain -ne "WORKGROUP") { $sb.AppendLine("    <domain>$domain</domain>") | Out-Null }
    try{ $lastboot = XmlEscape(($DeviceInfo['OS'].LastBootUpTime) -as [string]) } catch { $lastboot = "" }
    if($lastboot){ $sb.AppendLine("    <last_boot>$lastboot</last_boot>") | Out-Null }
} catch {}

try{
    # TPM info (may require elevated privileges)
    if (Get-Command Get-Tpm -ErrorAction SilentlyContinue) {
        $t = Get-Tpm 2>$null
        if($t){
            $sb.AppendLine('    <tpm>') | Out-Null
            $sb.AppendLine("      <present>$(XmlEscape($t.TpmPresent))</present>") | Out-Null
            $sb.AppendLine("      <ready>$(XmlEscape($t.TpmReady))</ready>") | Out-Null
            $sb.AppendLine('    </tpm>') | Out-Null
        }
    }
} catch {}

try{
    # BitLocker volumes (may require admin)
    if (Get-Command Get-BitLockerVolume -ErrorAction SilentlyContinue) {
        $b = Get-BitLockerVolume -ErrorAction SilentlyContinue
        if($b){
            $sb.AppendLine('    <bitlocker>') | Out-Null
            foreach($bv in $b){
                $sb.AppendLine('      <volume>') | Out-Null
                $sb.AppendLine("        <mount>$(XmlEscape($bv.MountPoint))</mount>") | Out-Null
                $sb.AppendLine("        <protectors>$(XmlEscape($bv.KeyProtector))</protectors>") | Out-Null
                $sb.AppendLine('      </volume>') | Out-Null
            }
            $sb.AppendLine('    </bitlocker>') | Out-Null
        }
    }
} catch {}

try{
    # Firewall profiles summary
    if (Get-Command Get-NetFirewallProfile -ErrorAction SilentlyContinue) {
        $fw = Get-NetFirewallProfile -ErrorAction SilentlyContinue
        if($fw){
            $sb.AppendLine('    <firewall>') | Out-Null
            foreach($f in $fw){
                $sb.AppendLine('      <profile>') | Out-Null
                $sb.AppendLine("        <name>$(XmlEscape($f.Name))</name>") | Out-Null
                $sb.AppendLine("        <enabled>$(XmlEscape($f.Enabled))</enabled>") | Out-Null
                $sb.AppendLine('      </profile>') | Out-Null
            }
            $sb.AppendLine('    </firewall>') | Out-Null
        }
    }
} catch {}

try{
    # Locale and timezone
    $tz = (Get-TimeZone).Id 2>$null
    $loc = (Get-Culture).Name 2>$null
    if($tz){ $sb.AppendLine("    <timezone>$(XmlEscape($tz))</timezone>") | Out-Null }
    if($loc){ $sb.AppendLine("    <locale>$(XmlEscape($loc))</locale>") | Out-Null }
} catch {}

$sb.AppendLine('  </sys>') | Out-Null
$sb.AppendLine('</system>') | Out-Null

$xml = $sb.ToString()

try{ $base = "C:\ProgramData\ITAM"; if(!(Test-Path $base)){ New-Item -ItemType Directory -Path $base -Force | Out-Null }; $xmlPath = Join-Path $base "$hostname-oa.xml"; $xml | Out-File -FilePath $xmlPath -Encoding utf8 } catch {}

try{
    $form = @{ data = $xml }
    $resp = Invoke-RestMethod -Uri $OaUrl -Method Post -Body $form -ContentType 'application/x-www-form-urlencoded'
    Log "OA response: $($resp | Out-String)"
    Write-Host "Device info sent to Open-AudIT (detailed XML)."
} catch {
    Log "Detailed XML submit failed: $($_.Exception.Message)"
    try{
        $Json = $DeviceInfo | ConvertTo-Json -Depth 8
        $r2 = Invoke-RestMethod -Uri $OaUrl -Method Post -Body $Json -ContentType 'application/json'
        Log "JSON fallback response: $($r2 | Out-String)"
        Write-Host "Device info sent to Open-AudIT (JSON fallback)."
    } catch {
        Log "JSON fallback failed: $($_.Exception.Message)"
        Write-Host "Failed to send device info: $($_.Exception.Message)"
    }
}

exit 0
