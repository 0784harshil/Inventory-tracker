import requests
import json
import datetime

# Supabase Credentials (from config.ini or hardcoded for debug)
SUPABASE_URL = 'https://xsyduihbgizgfvqucioq.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzeWR1aWhiZ2l6Z2Z2cXVjaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTE1NDYsImV4cCI6MjA4MjQyNzU0Nn0.OI9F1d_QN9mbEtk3PmWJRsXNBZG9wWh6Ihc-cvxroug'

def inspect_transfers():
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    
    print("--- FETCHING RECENT TRANSFERS ---")
    # Filter for today (2026-01-19)
    url = f'{SUPABASE_URL}/rest/v1/transfers?created_at=gt.2026-01-19T00:00:00&select=*&order=created_at.desc'
    
    res = requests.get(url, headers=headers)
    
    if res.status_code == 200:
        transfers = res.json()
        print(f"Found {len(transfers)} recent transfers:")
        print(json.dumps(transfers, indent=2))
    else:
        print(f"Error fetching: {res.status_code} - {res.text}")

if __name__ == '__main__':
    inspect_transfers()
