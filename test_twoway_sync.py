"""
Test Two-Way Sync: Verify items created via web appear in local database
"""

import pyodbc
import httpx
import time
from configparser import ConfigParser

# Load config
config = ConfigParser()
config.read('deploy-store-h/config.ini')

SQL_CONN_STR = config.get('database', 'connection_string')
SUPABASE_URL = config.get('supabase', 'url')
SUPABASE_KEY = config.get('supabase', 'key')
CLOUD_STORE_ID = config.get('database', 'cloud_store_id')
LOCAL_STORE_ID = config.get('database', 'local_store_id', fallback='1001')

print("=" * 60)
print("TWO-WAY SYNC TEST")
print("=" * 60)

# Step 1: Create test item in Supabase (simulating web interface)
print("\n[STEP 1] Creating test item in Supabase (cloud)...")
test_item = {
    'item_num': 'BIDIR-TEST-001',
    'item_name': 'Bidirectional Sync Test',
    'store_id': CLOUD_STORE_ID,
    'dept_id': 'TEST',
    'in_stock': 250,
    'cost': 10.00,
    'price': 20.00,
    'retail_price': 20.00
}

headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'resolution=merge-duplicates,return=minimal'
}

try:
    with httpx.Client(timeout=30) as client:
        response = client.post(
            f"{SUPABASE_URL}/rest/v1/inventory?on_conflict=item_num,store_id",
            json=test_item,
            headers=headers
        )
        if response.status_code in [200, 201]:
            print(f"[OK] Item created in Supabase: {test_item['item_num']}")
        else:
            print(f"[ERROR] Failed to create item: {response.status_code} - {response.text}")
            exit(1)
except Exception as e:
    print(f"[ERROR] Error creating item in Supabase: {e}")
    exit(1)

# Step 2: Verify item exists in Supabase
print("\n[STEP 2] Verifying item in Supabase...")
try:
    with httpx.Client(timeout=30) as client:
        response = client.get(
            f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.BIDIR-TEST-001&store_id=eq.{CLOUD_STORE_ID}",
            headers=headers
        )
        items = response.json()
        if items:
            print(f"[OK] Item found in Supabase:")
            print(f"   Item: {items[0]['item_name']}")
            print(f"   Stock: {items[0]['in_stock']}")
            print(f"   Store: {items[0]['store_id']}")
        else:
            print("[ERROR] Item NOT found in Supabase after creation!")
            exit(1)
except Exception as e:
    print(f"[ERROR] Error querying Supabase: {e}")
    exit(1)

# Step 3: Check if item exists in local database BEFORE sync
print("\n[STEP 3] Checking local database BEFORE sync...")
try:
    conn = pyodbc.connect(SQL_CONN_STR)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT ItemNum, ItemName, In_Stock, Store_ID FROM Inventory WHERE ItemNum = ? AND Store_ID = ?",
        ('BIDIR-TEST-001', LOCAL_STORE_ID)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        print(f"[WARN] Item ALREADY exists in local database:")
        print(f"   Item: {row[1]}, Stock: {row[2]}")
    else:
        print("[OK] Item NOT in local database yet (expected before sync)")
except Exception as e:
    print(f"[ERROR] Error checking local database: {e}")

# Step 4: Run sync agent (one cycle)
print("\n[STEP 4] Instructions for sync:")
print("-" * 60)
print("NOW RUN THE SYNC AGENT:")
print("  python sync-agent/sync_agent.py")
print("")
print("Wait for one sync cycle (30 seconds) and look for:")
print("  'Inserted new item BIDIR-TEST-001 from cloud to local DB'")
print("")
print("Then press Ctrl+C to stop the agent and run this script again")
print("to verify the item was synced.")
print("-" * 60)

# Step 5: Check local database AFTER sync
print("\n[STEP 5] Checking local database AFTER sync...")
print("(Run this script again after running the sync agent)")
try:
    conn = pyodbc.connect(SQL_CONN_STR)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT ItemNum, ItemName, In_Stock, Cost, Price, Store_ID FROM Inventory WHERE ItemNum = ? AND Store_ID = ?",
        ('BIDIR-TEST-001', LOCAL_STORE_ID)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if row:
        print(f"[SUCCESS] Item synced to local database:")
        print(f"   Item Number: {row[0]}")
        print(f"   Item Name: {row[1]}")
        print(f"   In Stock: {row[2]}")
        print(f"   Cost: ${row[3]:.2f}")
        print(f"   Price: ${row[4]:.2f}")
        print(f"   Store ID: {row[5]}")
        print("\n*** TWO-WAY SYNC IS WORKING! ***")
    else:
        print("[WARN] Item still NOT in local database")
        print("   Make sure sync agent completed one cycle")
except Exception as e:
    print(f"[ERROR] Error checking local database: {e}")

print("\n" + "=" * 60)

