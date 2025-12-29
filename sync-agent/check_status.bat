@echo off
echo Checking Inventory Sync Agent Status...
echo.
sc query InventorySyncAgent
echo.
echo ========================================
echo Recent sync log entries:
echo ========================================
if exist sync_agent.log (
    powershell -command "Get-Content sync_agent.log -Tail 20"
) else (
    echo No log file found yet.
)
pause
