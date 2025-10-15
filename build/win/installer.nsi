; itam-agent Windows installer — drops scripts to %ProgramData%\ITAM and runs enroll.ps1

OutFile "..\..\static\installers\itam-agent-win-dev.exe"
RequestExecutionLevel admin
Unicode true
SilentInstall silent
ShowInstDetails nevershow
SetCompress auto
SetCompressor /SOLID lzma

Section
  ; Resolve %ProgramData% via environment (works on all NSIS versions)
  ReadEnvStr $0 "ProgramData"          ; e.g. C:\ProgramData
  StrCpy $INSTDIR "$0\ITAM"

  ; Create target and copy payload
  CreateDirectory "$INSTDIR"
  SetOutPath "$INSTDIR"
  File "files\oa_runner.ps1"
  File "files\enroll.ps1"

  ; Run enroll once and wait for it to finish
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "$INSTDIR\enroll.ps1"'
SectionEnd
