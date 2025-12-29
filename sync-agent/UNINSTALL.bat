@echo off
echo Removing Inventory Sync Agent...
schtasks /delete /tn "InventorySyncAgent" /f
taskkill /f /im python.exe 2>nul
echo Done! Sync agent has been removed.
pause
