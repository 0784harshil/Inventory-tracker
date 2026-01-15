
import os

CONTENT = """[SETTINGS]
SQL_SERVER = HARSHIL\PCAMERICA
SQL_DATABASE = cresqlh
WINDOWS_AUTH = true
CLOUD_STORE_ID = STORE-H
SYNC_INTERVAL = 30

[supabase]
url=https://xsyduihbgizgfvqucioq.supabase.co
key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeWR1aWhiZ2l6Z2Z2cXVjaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE1NDYsImV4cCI6MjA4MjQyNzU0Nn0.OI9F1d_QN9mbEtk3PmWJRsXNBZG9wWh6Ihc-cvxroug
"""

# Write to current directory config.ini with UTF-8
with open('config.ini', 'w', encoding='utf-8') as f:
    f.write(CONTENT)
    
print("Local config.ini repaired with UTF-8.")
