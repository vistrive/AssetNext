; ITAM Agent Windows Installer (NSIS)
; build/win/installer.nsi

Name "ITAM Agent"
OutFile "itam-agent-win.exe"
RequestExecutionLevel admin
ShowInstDetails nevershow
SetCompress auto
SetCompressor /SOLID lzma

Section
  ReadEnvStr $0 "ProgramData"      ; e.g. C:\ProgramData
  StrCpy $INSTDIR "$0\ITAM"

  CreateDirectory "$INSTDIR"
  SetOutPath "$INSTDIR"

  ; Embed the advanced agent script
  File "files\oa_agent_advanced.ps1"

  ; Run agent script hidden, wait for completion
  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\oa_agent_advanced.ps1"'
SectionEnd

