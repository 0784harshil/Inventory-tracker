@echo off
:: ============================================
:: ONE-TIME SETUP - Run this once as Admin
:: After this, sync runs automatically forever
:: ============================================

echo ==========================================
echo   INVENTORY SYNC - ONE TIME SETUP
echo   Run this ONCE, then forget about it!
echo ==========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please right-click and "Run as administrator"
    pause
    exit /b 1
)

:: Get current directory
set SCRIPT_DIR=%~dp0
set PYTHON_SCRIPT=%SCRIPT_DIR%sync_agent.py

echo [1/3] Installing Python packages...
pip install pyodbc supabase python-dotenv >nul 2>&1
echo       Done!

echo.
echo [2/3] Creating Windows Startup Task...

:: Create a VBS script to run Python silently (no black window)
echo Set WshShell = CreateObject("WScript.Shell") > "%SCRIPT_DIR%run_hidden.vbs"
echo WshShell.Run "python ""%PYTHON_SCRIPT%""", 0, False >> "%SCRIPT_DIR%run_hidden.vbs"

:: Create scheduled task that runs at startup
schtasks /delete /tn "InventorySyncAgent" /f >nul 2>&1
schtasks /create /tn "InventorySyncAgent" /tr "wscript.exe \"%SCRIPT_DIR%run_hidden.vbs\"" /sc onstart /ru SYSTEM /rl highest /f

if %errorLevel% neq 0 (
    echo ERROR: Failed to create scheduled task
    pause
    exit /b 1
)
echo       Done!

echo.
echo [3/3] Starting sync agent now...
start "" wscript.exe "%SCRIPT_DIR%run_hidden.vbs"
echo       Done!

echo.
echo ==========================================
echo   SETUP COMPLETE!
echo ==========================================
echo.
echo The sync agent is now:
echo   [x] Running in the background
echo   [x] Will start automatically on every reboot
echo   [x] Completely invisible (no windows)
echo.
echo To check if it's running, look for python.exe
echo in Task Manager, or check sync_agent.log
echo.
pause
