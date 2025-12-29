@echo off
:: ============================================
:: ONE-TIME SETUP FOR EXE VERSION
:: Run this ONCE as Admin on each store PC
:: ============================================

echo ==========================================
echo   INVENTORY SYNC - ONE TIME SETUP
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
set EXE_PATH=%SCRIPT_DIR%InventorySyncAgent.exe

:: Check if exe exists
if not exist "%EXE_PATH%" (
    echo ERROR: InventorySyncAgent.exe not found!
    echo Make sure this file is in the same folder as the exe.
    pause
    exit /b 1
)

:: Check if config exists
if not exist "%SCRIPT_DIR%config.ini" (
    echo ERROR: config.ini not found!
    echo Please create config.ini with your store settings.
    pause
    exit /b 1
)

echo [1/2] Creating Windows Startup Task...

:: Delete old task if exists
schtasks /delete /tn "InventorySyncAgent" /f >nul 2>&1

:: Create task that runs at startup
schtasks /create /tn "InventorySyncAgent" /tr "\"%EXE_PATH%\"" /sc onstart /ru SYSTEM /rl highest /f

if %errorLevel% neq 0 (
    echo ERROR: Failed to create scheduled task
    pause
    exit /b 1
)
echo       Done!

echo.
echo [2/2] Starting sync agent now...
start "" "%EXE_PATH%"
echo       Done!

echo.
echo ==========================================
echo   SETUP COMPLETE!
echo ==========================================
echo.
echo The sync agent is now:
echo   [x] Running in the background
echo   [x] Will start automatically on every reboot
echo   [x] Completely invisible
echo.
echo Check sync_agent.log for status
echo.
pause
