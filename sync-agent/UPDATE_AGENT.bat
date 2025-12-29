@echo off
:: ============================================
:: UPDATE SYNC AGENT
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
set "NEW_EXE=%SCRIPT_DIR%dist\InventorySyncAgent.exe"
set "DEPLOY_DIR=%SCRIPT_DIR%dist\deploy"
set "OLD_EXE=%DEPLOY_DIR%\InventorySyncAgent.exe"

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

:: Check if new EXE exists
if not exist "%NEW_EXE%" (
    echo.
    echo ERROR: New EXE not found at:
    echo   %NEW_EXE%
    echo.
    echo Please run BUILD_EXE.bat first to create the new EXE.
    pause
    exit /b 1
)

:: Copy the new EXE
echo.
echo Step 3: Copying new EXE to deploy folder...
copy /Y "%NEW_EXE%" "%OLD_EXE%" >nul 2>&1
if %errorLevel% equ 0 (
    echo   [OK] New EXE copied successfully
) else (
    echo   [FAIL] Could not copy file. Retrying...
    timeout /t 2 /nobreak >nul
    copy /Y "%NEW_EXE%" "%OLD_EXE%" >nul 2>&1
    if %errorLevel% equ 0 (
        echo   [OK] Retry successful
    ) else (
        echo.
        echo ERROR: Still cannot copy file. The process may still be running.
        echo Try restarting your computer and running this script again.
        pause
        exit /b 1
    )
)

:: Restart the sync agent
echo.
echo Step 4: Restarting sync agent...
cd /d "%DEPLOY_DIR%"
start "" /B wscript.exe "%DEPLOY_DIR%\run_hidden.vbs" >nul 2>&1
if %errorLevel% equ 0 (
    echo   [OK] Sync agent restarted
) else (
    echo   [--] Could not auto-restart. Run SETUP_ONCE_EXE.bat in the deploy folder.
)

echo.
echo ========================================
echo   UPDATE COMPLETE!
echo ========================================
echo.
echo The sync agent has been updated with the new transfer processing logic.
echo It will now:
echo   - Process approved outgoing transfers (decrement stock)
echo   - Process completed incoming transfers (increment stock)
echo.
pause
