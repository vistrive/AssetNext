@echo off
echo ============================================
echo ITAM Agent - OpenAudit Inventory Collection
echo ============================================
echo.
echo [INFO] Working directory: %CD%
echo [INFO] ProgramData: %ProgramData%
echo [INFO] Script location: %ProgramData%\ITAM\oa_agent_advanced.ps1
echo.

set SCRIPT_PATH=%ProgramData%\ITAM\oa_agent_advanced.ps1
set LOG_PATH=%ProgramData%\ITAM\audit.log

echo [1/3] Checking for script file...
if exist "%SCRIPT_PATH%" (
    echo [OK] Found script at: %SCRIPT_PATH%
    for %%A in ("%SCRIPT_PATH%") do echo [INFO] Script size: %%~zA bytes
    echo.
    echo [2/3] Running PowerShell audit script...
    echo [INFO] This may take 2-5 minutes to collect all hardware/software data...
    echo [INFO] Output is being logged to: %LOG_PATH%
    echo.
    
    powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "& '%SCRIPT_PATH%' -debugging 1 -submit_online 'y' -create_file 'n' | Tee-Object -FilePath '%LOG_PATH%'"
    
    echo.
    echo [3/3] Script execution completed with exit code: %ERRORLEVEL%
    echo.
    
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Audit completed successfully!
        echo [INFO] Device should now appear in OpenAudit with full details.
    ) else (
        echo [ERROR] Script failed with exit code: %ERRORLEVEL%
        echo [INFO] Check the log file at: %LOG_PATH%
    )
) else (
    echo [ERROR] Script file not found at %SCRIPT_PATH%
    echo.
    echo [DEBUG] Listing contents of %ProgramData%\ITAM:
    dir "%ProgramData%\ITAM" 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Directory does not exist!
    )
)

echo.
echo ============================================
echo Press any key to close this window...
echo ============================================
pause >nul
