@echo off
echo ========================================
echo   Inventory Sync Agent - Easy Installer
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run this script as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
pip install pywin32
if %errorLevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Running post-install for pywin32...
python -c "import win32api" 2>nul
if %errorLevel% neq 0 (
    python Scripts\pywin32_postinstall.py -install 2>nul
)

echo.
echo [3/4] Installing Windows Service...
python install_service.py install
if %errorLevel% neq 0 (
    echo ERROR: Failed to install service
    pause
    exit /b 1
)

echo.
echo [4/4] Configuring service for auto-restart...
sc failure InventorySyncAgent reset= 86400 actions= restart/60000/restart/60000/restart/60000
sc config InventorySyncAgent start= auto

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo IMPORTANT: Before starting the service, edit config.ini with:
echo   - Your SQL Server connection string
echo   - Your Supabase URL and key
echo   - Your Store ID
echo.
echo To start the service, run: start_service.bat
echo To stop the service, run:  stop_service.bat
echo.
pause
