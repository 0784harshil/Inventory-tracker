@echo off
echo Removing Sync Agent from Startup...

set "ShortcutName=SyncAgent.lnk"
set "StartupDir=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

if exist "%StartupDir%\%ShortcutName%" (
    del "%StartupDir%\%ShortcutName%"
    echo.
    echo SUCCESS: Sync Agent removed from startup.
) else (
    echo.
    echo Sync Agent was not found in startup.
)

echo.
echo Stopping running agent...
taskkill /F /IM SyncAgent.exe /T 2>nul
echo Done.

pause
