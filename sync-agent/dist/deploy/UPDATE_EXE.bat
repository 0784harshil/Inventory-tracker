@echo off
:: ============================================
:: UPDATE SYNC AGENT (Deploy Version)
:: Run this as Administrator to update the EXE
:: ============================================

echo ========================================
echo   Inventory Sync Agent - Update Tool
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script requires Administrator privileges.
    echo.
    echo Right-click this file and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

set "SCRIPT_DIR=%~dp0"
set "EXE_FILE=%SCRIPT_DIR%InventorySyncAgent.exe"
set "NEW_EXE=%SCRIPT_DIR%InventorySyncAgent_NEW.exe"

:: Check if new EXE exists
if not exist "%NEW_EXE%" (
    echo.
    echo ERROR: New EXE not found!
    echo.
    echo To update the sync agent:
    echo   1. Copy the new InventorySyncAgent.exe to this folder
    echo   2. Rename it to: InventorySyncAgent_NEW.exe
    echo   3. Run this script again as Administrator
    echo.
    pause
    exit /b 1
)

echo Step 1: Stopping sync agent processes...
taskkill /F /IM InventorySyncAgent.exe >nul 2>&1
if %errorLevel% equ 0 (
    echo   [OK] Sync agent stopped
) else (
    echo   [--] No running sync agent found
)

:: Wait a moment for file handles to release
echo.
echo Step 2: Waiting for file handles to release...
timeout /t 3 /nobreak >nul
echo   [OK] Done

:: Backup old EXE
echo.
echo Step 3: Backing up old EXE...
if exist "%EXE_FILE%" (
    copy /Y "%EXE_FILE%" "%SCRIPT_DIR%InventorySyncAgent_OLD.exe" >nul 2>&1
    echo   [OK] Backup created: InventorySyncAgent_OLD.exe
)

:: Replace with new EXE
echo.
echo Step 4: Installing new EXE...
move /Y "%NEW_EXE%" "%EXE_FILE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo   [OK] New EXE installed
) else (
    echo   [FAIL] Could not replace file. Retrying...
    timeout /t 2 /nobreak >nul
    move /Y "%NEW_EXE%" "%EXE_FILE%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo   [OK] Retry successful
    ) else (
        echo.
        echo ERROR: Still cannot replace file. 
        echo Try restarting the computer and running this script again.
        pause
        exit /b 1
    )
)

:: Restart the sync agent
echo.
echo Step 5: Restarting sync agent...
if exist "%SCRIPT_DIR%run_hidden.vbs" (
    start "" /B wscript.exe "%SCRIPT_DIR%run_hidden.vbs" >nul 2>&1
    echo   [OK] Sync agent restarted
) else (
    echo   [--] run_hidden.vbs not found. Run SETUP_ONCE_EXE.bat to restart.
)

echo.
echo ========================================
echo   UPDATE COMPLETE!
echo ========================================
echo.
echo The sync agent now supports transfer processing.
echo.
pause
