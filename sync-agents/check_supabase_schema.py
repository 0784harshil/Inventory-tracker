
import requests
import json

# Manual config load (since I can't rely on env vars being set in this shell perfectly)
config = {}
try:
    with open('deploy-store-h/config.ini', 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                config[key.strip()] = val.strip()
    if not config.get('url'): raise Exception("No URL")
except:
    # Try local config
    with open('config.ini', 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                config[key.strip()] = val.strip()

SUPABASE_URL = config.get('url')
SUPABASE_KEY = config.get('key')
STORE_ID = 'STORE-H'

def check_schema():
    print(f"Checking Supabase Schema at {SUPABASE_URL}...")
    headers = {
        'apikey': SUPABASE_KEY, 
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Try to select the specific column 'itemtype'
    url = f"{SUPABASE_URL}/rest/v1/inventory?select=itemtype&limit=1"
    
    try:
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            print("✅ SUCCESS: 'itemtype' column exists in Supabase!")
            print(f"Sample data: {res.json()}")
            return True
        else:
            print(f"❌ FAILURE: Supabase returned error {res.status_code}")
            print(res.text)
            return False
    except Exception as e:
        print(f"❌ ERROR: Connection failed: {e}")
        return False

if __name__ == "__main__":
    check_schema()
