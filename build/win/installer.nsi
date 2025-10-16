; ITAM Agent Windows Installer (NSIS); build/win/installer.nsi

Name "ITAM Agent"Name "ITAM Agent"

OutFile "itam-agent-win.exe"OutFile "itam-agent-win.exe"

RequestExecutionLevel adminRequestExecutionLevel admin

ShowInstDetails nevershowShowInstDetails nevershow

SetCompress autoSetCompress auto

SetCompressor /SOLID lzmaSetCompressor /SOLID lzma



SectionSection

  ReadEnvStr $0 "ProgramData"      ; e.g. C:\ProgramData  ReadEnvStr $0 "ProgramData"      ; e.g. C:\ProgramData

  StrCpy $INSTDIR "$0\ITAM"  StrCpy $INSTDIR "$0\ITAM"



  CreateDirectory "$INSTDIR"  CreateDirectory "$INSTDIR"

  SetOutPath "$INSTDIR"  SetOutPath "$INSTDIR"



  ; Embed the advanced agent script  ; Only the bootstrapper gets embedded

  File "files\oa_agent_advanced.ps1"  File "files\install_agent.ps1"



  ; Run agent script hidden, wait for completion  ; Run bootstrap hidden; wait

  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\oa_agent_advanced.ps1"'  ExecWait '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\install_agent.ps1"'

SectionEndSectionEnd

