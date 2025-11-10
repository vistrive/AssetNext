@echo off
REM ============================================
REM ITAM Network Discovery Scanner Launcher
REM ============================================

cd /d "%~dp0"

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PowerShell is not available on this system.
    echo Please install PowerShell to run the network discovery scanner.
    pause
    exit /b 1
)

REM Run the PowerShell script
powershell.exe -ExecutionPolicy Bypass -File "%~dp0itam-discovery.ps1"

pause
