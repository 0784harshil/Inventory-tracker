# STORE-K Sync Agent Deployment

## Quick Start

1. **Copy this entire folder** to the STORE-K machine
2. **Double-click `START_SYNC_AGENT.bat`**

That's it! The script will:
- Check if Python is installed
- Install required packages (pyodbc, httpx)
- Start the sync agent

## What It Does

The sync agent will:
- Sync CRESQLK inventory to the cloud every 30 seconds
- Process **incoming transfers** - when a transfer TO STORE-K is marked "completed", it will ADD stock to CRESQLK
- Process **outgoing transfers** - when a transfer FROM STORE-K is approved, it will SUBTRACT stock from CRESQLK

## Requirements

- **Python 3.8+** - Download from https://www.python.org/downloads/
  - During installation, CHECK "Add Python to PATH"
- **ODBC Driver 17 for SQL Server** - Usually already installed with PCamerica

## Configuration

If needed, edit `config.ini`:
- Change `SERVER` if your SQL Server instance has a different name
- The database is set to `CRESQLK`
- The store ID is set to `STORE-K`

## Logs

Check `sync_agent.log` in this folder for sync status and any errors.

## To Run at Startup

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `START_SYNC_AGENT.bat` in that folder
