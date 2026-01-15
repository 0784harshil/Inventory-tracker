
import requests
import os
import json

# Load config manually since simple parser
config = {}
with open('deploy-store-h/config.ini', 'r') as f:
    for line in f:
        if '=' in line:
            key, val = line.strip().split('=', 1)
            config[key.strip()] = val.strip()

SUPABASE_URL = config.get('url')
SUPABASE_KEY = config.get('key')
STORE_ID = 'STORE-H'

def check_item(item_num):
    print(f"--- Checking Item {item_num} in Supabase ---")
    headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
    
    # 1. Check if it exists at all
    url = f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{item_num}"
    res = requests.get(url, headers=headers)
    items = res.json()
    
    if not items:
        print("❌ Item NOT FOUND in Supabase with this ItemNum!")
        return

    print(f"✅ Found {len(items)} records for this ItemNum.")
    for i, item in enumerate(items):
        print(f"\nRecord #{i+1}:")
        print(f"  ID: {item.get('id')}")
        print(f"  Store ID: '{item.get('store_id')}' (Expected: '{STORE_ID}')")
        print(f"  Cost: {item.get('cost')}")
        print(f"  Price: {item.get('price')}")
        print(f"  Updated At: {item.get('updated_at')}")
        
        if item.get('store_id') != STORE_ID:
            print("  ⚠️ MISMATCH: Store ID does not match agent's Store ID!")

if __name__ == "__main__":
    check_item('87654321')
