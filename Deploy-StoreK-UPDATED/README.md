# Store K Sync Agent Deployment

## Setup Instructions

1. **Edit config-k.ini**:
   - Set `SQL_SERVER` to your SQL Server instance name
   - Set `SQL_DATABASE` to your database name (e.g., `cresqlk`)
   - Keep `CLOUD_STORE_ID = STORE-K`

2. **Run the agent**:
   - Double-click `START.bat`

## Files

| File | Purpose |
|------|---------|
| StoreK-SyncAgent.exe | Main sync agent executable |
| config-k.ini | Configuration file (EDIT THIS) |
| START.bat | Launch script |

## Requirements

- Windows OS
- SQL Server with your inventory database
- Network access to Supabase
