@echo off
echo ============================================
echo  STORE-K Sync Agent - Quick Start
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)

echo Python found. Installing dependencies...
pip install pyodbc httpx

echo.
echo Starting Sync Agent for STORE-K...
echo Press Ctrl+C to stop.
echo.

python sync_agent.py

pause
