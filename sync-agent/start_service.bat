@echo off
echo Starting Inventory Sync Agent Service...
net start InventorySyncAgent
if %errorLevel% equ 0 (
    echo Service started successfully!
    echo Sync agent is now running in the background.
) else (
    echo Failed to start service. Check Event Viewer for errors.
)
pause
