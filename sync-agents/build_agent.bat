
@echo off
echo Building Store H Agent...
pyinstaller --onefile --console --name "JD-GURUS-StoreH-Sync" store-h-agent.py

echo Building Store K Agent...
pyinstaller --onefile --console --name "JD-GURUS-StoreK-Sync" store-k-agent.py

echo Done!
pause
