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

# Serialize to JSON
$Json = $DeviceInfo | ConvertTo-Json -Depth 5

# === Post to Open-AudIT ===
try {
    $Response = Invoke-RestMethod -Uri $OaUrl -Method Post -Body $Json -ContentType 'application/json'
    Write-Host "Device info sent successfully."
} catch {
    Write-Host "Failed to send device info: $($_.Exception.Message)"
}

exit 0
