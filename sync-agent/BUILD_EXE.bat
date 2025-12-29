@echo off
:: ============================================
:: BUILD EXE - Creates standalone executable
:: ============================================

echo ==========================================
echo   Building Inventory Sync Agent EXE
echo ==========================================
echo.

echo [1/3] Installing PyInstaller...
pip install pyinstaller pyodbc httpx python-dotenv
if %errorLevel% neq 0 (
    echo ERROR: Failed to install PyInstaller
    pause
    exit /b 1
)

echo.
echo [2/3] Building EXE (this takes ~1-2 minutes)...
pyinstaller --onefile --noconsole --name "InventorySyncAgent" --icon=NONE sync_agent.py

if %errorLevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/3] Creating distribution folder...
if not exist "dist\deploy" mkdir "dist\deploy"
copy "dist\InventorySyncAgent.exe" "dist\deploy\"
copy "config.ini" "dist\deploy\"
copy "SETUP_ONCE_EXE.bat" "dist\deploy\SETUP_ONCE.bat" 2>nul

echo.
echo ==========================================
echo   BUILD COMPLETE!
echo ==========================================
echo.
echo Your files are in: dist\deploy\
echo.
echo Contents:
echo   - InventorySyncAgent.exe  (the sync program)
echo   - config.ini              (edit for each store)
echo   - SETUP_ONCE.bat          (run once as admin)
echo.
echo Copy the "deploy" folder to each store computer!
echo.
pause
