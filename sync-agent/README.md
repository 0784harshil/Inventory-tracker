# Inventory Sync Agent

This Python script syncs inventory data from your local SQL Server to the Supabase cloud database.

## Setup

### 1. Install Python (if not already installed)
Download from https://www.python.org/downloads/

### 2. Install Dependencies
```bash
cd sync-agent
pip install -r requirements.txt
```

### 3. Configure the Agent
Edit `config.ini` with your settings:

```ini
[database]
connection_string = DRIVER={ODBC Driver 17 for SQL Server};SERVER=HARSHIL\PCAMERICA;DATABASE=cresql;Trusted_Connection=yes;
store_id = 001

[supabase]
url = https://YOUR-PROJECT-ID.supabase.co
key = YOUR-SUPABASE-ANON-KEY

[sync]
interval_seconds = 30
```

### 4. Run the Agent
```bash
python sync_agent.py
```

## Running as a Windows Service

To run continuously in the background:

### Option 1: Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: "When the computer starts"
4. Action: Start a program
5. Program: `python.exe`
6. Arguments: `C:\path\to\sync_agent.py`

### Option 2: NSSM (Non-Sucking Service Manager)
```bash
# Download NSSM from https://nssm.cc/
nssm install InventorySyncAgent "C:\Python39\python.exe" "C:\path\to\sync_agent.py"
nssm start InventorySyncAgent
```

## Logs
Check `sync_agent.log` for sync status and errors.
