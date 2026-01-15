@echo off
set "SCRIPT_DIR=%~dp0"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\StockFlowAgent.lnk"
set "TARGET_EXE=%SCRIPT_DIR%sync_agent.exe"

if not exist "%TARGET_EXE%" (
    echo Error: sync_agent.exe not found in %SCRIPT_DIR%
    pause
    exit /b
)

echo Creating startup shortcut...
echo Target: %TARGET_EXE%
echo Location: %SHORTCUT_PATH%

powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%TARGET_EXE%';$s.WorkingDirectory='%SCRIPT_DIR%';$s.Save()"

echo.
echo ========================================================
echo   SUCCESS! StockFlow Agent will now start automatically.
echo ========================================================
echo.
pause
