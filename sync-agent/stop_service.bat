@echo off
echo Stopping Inventory Sync Agent Service...
net stop InventorySyncAgent
if %errorLevel% equ 0 (
    echo Service stopped successfully!
) else (
    echo Service may not be running.
)
pause
