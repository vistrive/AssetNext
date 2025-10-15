# enroll.ps1 — runs oa_runner.ps1 safely, logs outcome

param(
  [string]$ItamDir = "$env:ProgramData\ITAM"
)

$ErrorActionPreference = 'Continue'
$log = Join-Path $ItamDir "install.log"

function W($msg){ try { "[{0}] {1}" -f (Get-Date -Format o), $msg | Out-File -FilePath $log -Append -Encoding utf8 } catch {} }

try {
  if (-not (Test-Path $ItamDir)) { New-Item -ItemType Directory -Path $ItamDir -Force | Out-Null }
} catch {}

W "START enroll.ps1 (ItamDir=$ItamDir)"

# Unblock and run
$runner = Join-Path $ItamDir "oa_runner.ps1"
try { Unblock-File -Path $runner -ErrorAction SilentlyContinue } catch {}

W "RUN: $runner"

# Launch in-process with relaxed policy so it works even if the machine is restrictive
try {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError  = $true
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $p = [System.Diagnostics.Process]::Start($psi)
  $p.WaitForExit()
  W ("oa_runner exit code: {0}" -f $p.ExitCode)
} catch {
  W ("ERROR running runner: {0}" -f $_.Exception.Message)
}

W "END enroll.ps1"
