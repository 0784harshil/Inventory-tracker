
import os
import requests
import configparser

# Load credentials
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')

SUPABASE_URL = os.getenv("SUPABASE_URL") or config.get('supabase', 'url', fallback=None)
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or config.get('supabase', 'key', fallback=None)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Use PostgREST to get generic info. 
# A simple way to check columns is to fetch one item and see keys.
print("Fetching one item to inspect keys...")
url = f"{SUPABASE_URL}/rest/v1/inventory?limit=1"
response = requests.get(url, headers=headers)
data = response.json()

if data:
    keys = data[0].keys()
    print("Columns found in Supabase 'inventory' table:")
    for key in keys:
        print(f" - {key}")
    
    if 'item_type' in keys:
        print("\n✅ 'item_type' column EXISTS.")
    elif 'itemtype' in keys:
        print("\n⚠️ 'itemtype' column found (without underscore).")
    else:
        print("\n❌ 'item_type' column MISSING.")
else:
    print("No items found to inspect.")
