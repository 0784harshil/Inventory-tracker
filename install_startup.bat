@echo off
echo Installing Sync Agent to Startup...

set "ShortcutName=SyncAgent.lnk"
set "StartupDir=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TargetPath=%~dp0SyncAgent.exe"
set "WorkingDir=%~dp0"

echo Target Path: %TargetPath%
echo Startup Dir: %StartupDir%

powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%StartupDir%\%ShortcutName%');$s.TargetPath='%TargetPath%';$s.WorkingDirectory='%WorkingDir%';$s.Save()"

if exist "%StartupDir%\%ShortcutName%" (
    echo.
    echo SUCCESS: Sync Agent has been added to startup!
    echo It will start automatically when you restart the computer.
    echo.
    echo Starting agent now...
    start "" "%TargetPath%"
) else (
    echo.
    echo ERROR: Failed to create startup shortcut.
)

pause
