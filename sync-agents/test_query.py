
import requests
import os
import json

# Manual config load
config = {}
with open('deploy-store-h/config.ini', 'r') as f:
    for line in f:
        if '=' in line:
            key, val = line.strip().split('=', 1)
            config[key.strip()] = val.strip()

SUPABASE_URL = config.get('url')
SUPABASE_KEY = config.get('key')
STORE_ID = 'STORE-H'
LAST_SYNC = '2026-01-13T16:52:52.498574+00:00'

def test():
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    # Exact URL from agent
    url = f"{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&or=(updated_at.gt.{LAST_SYNC},created_at.gt.{LAST_SYNC})"
    
    print(f"Query URL: {url}")
    res = requests.get(url, headers=headers)
    print(f"Status: {res.status_code}")
    items = res.json()
    if not isinstance(items, list):
        print(f"Response is NOT a list: {items}")
        return

    print(f"Items found: {len(items)}")
    
    # Check if target item is in list
    found = False
    for i in items:
        if str(i.get('item_num')).strip() == '87654321':
            print(f"✅ Found target item! Updated: {i.get('updated_at')}")
            found = True
            break
            
    if not found:
        print("❌ Target item NOT found in response.")

if __name__ == "__main__":
    test()
