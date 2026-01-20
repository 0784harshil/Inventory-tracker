
import pyodbc
import os
import json
import time
import requests
from datetime import datetime, timezone

import configparser

# Load Config (Robustly)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config-k.ini') # Testing Store K

def read_config():
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE):
        config.read(CONFIG_FILE)
    return config

CONF_OBJ = read_config()
SETTINGS = CONF_OBJ['SETTINGS'] if 'SETTINGS' in CONF_OBJ else {}
SUPABASE_SEC = CONF_OBJ['supabase'] if 'supabase' in CONF_OBJ else {}

SUPABASE_URL = SUPABASE_SEC.get('url', '')
SUPABASE_KEY = SUPABASE_SEC.get('key', '')

# Fallback for hardcoded test if needed, but prefer config
if not SUPABASE_URL:
    print("[ERROR] Could not load SUPABASE_URL from config-k.ini")
    exit(1)

SQL_SERVER = SETTINGS.get('SQL_SERVER', 'HARSHIL\\PCAMERICA')
DATABASE = SETTINGS.get('SQL_DATABASE', 'cresqlk')
STORE_ID_CLOUD = SETTINGS.get('CLOUD_STORE_ID', 'STORE-K')

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

TEST_ITEM_NUM = "TEST_DP_01"
TEST_DEPT = "TST_DEPT"

def check_store_ids():
    print("0. Checking Cloud Store IDs...")
    res = requests.get(f"{SUPABASE_URL}/rest/v1/stores?select=*", headers=headers)
    if res.status_code == 200:
        stores = res.json()
        print(f"   Found {len(stores)} stores:")
        for s in stores:
            print(f"   - ID: {s.get('store_id')} | Name: {s.get('name')}")
    else:
        print(f"   [ERROR] Failed to fetch stores: {res.text}")

def setup_cloud_item():
    check_store_ids()
    print(f"1. Injecting Test Item '{TEST_ITEM_NUM}' with Dept '{TEST_DEPT}' into Cloud...")
    
    payload = {
        "item_num": TEST_ITEM_NUM,
        "item_name": "Test Dropdown Item",
        "store_id": "1001", # Store K Local ID? or Cloud ID 'STORE-K'? 
        # Agents map Cloud 'STORE-K' to local... wait.
        # Store K Agent: local_store_id = 1001.
        # But Sync Down checks "store_id = eq.STORE-K".
        # So I must insert with store_id='STORE-K'.
        "store_id": STORE_ID_CLOUD, 
        "dept_id": TEST_DEPT,
        "itemtype": 0,
        "in_stock": 100,
        "cost": 5.00,
        "price": 9.99,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if exists, delete first
    requests.delete(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{TEST_ITEM_NUM}", headers=headers)
    
    # Insert
    res = requests.post(f"{SUPABASE_URL}/rest/v1/inventory", headers=headers, json=payload)
    if res.status_code in [200, 201]:
        print("   [SUCCESS] Item injected into Cloud.")
    else:
        print(f"   [ERROR] Failed to inject item: {res.text}")
        exit(1)

def check_local_db():
    print("2. Connecting to Local DB (Store K)...")
    try:
        conn = pyodbc.connect(
            f'DRIVER={{ODBC Driver 17 for SQL Server}};'
            f'SERVER={SQL_SERVER};'
            f'DATABASE={DATABASE};'
            f'Trusted_Connection=yes;'
        )
        cursor = conn.cursor()
        
        print(f"3. Waiting for Agent to Sync (Auto-Heal '{TEST_DEPT}')...")
        for i in range(60): # Wait up to 300s (5 mins) for full sync
            print(f"   Check {i+1}/60...")
            
            # Check Dept
            cursor.execute("SELECT Dept_ID FROM Departments WHERE Dept_ID = ?", (TEST_DEPT,))
            dept = cursor.fetchone()
            
            # Check Item
            cursor.execute("SELECT ItemNum, Dept_ID FROM Inventory WHERE ItemNum = ?", (TEST_ITEM_NUM,))
            item = cursor.fetchone()
            
            if dept and item:
                print("\n[VERIFIED] SUCCESS!")
                print(f"   - Department '{TEST_DEPT}' FOUND locally (Auto-Healed).")
                print(f"   - Item '{TEST_ITEM_NUM}' FOUND locally.")
                return True
            
            if not dept:
                print(f"     -> Dept '{TEST_DEPT}' not found yet...")
            if not item:
                print(f"     -> Item '{TEST_ITEM_NUM}' not found yet...")
                
            time.sleep(5)
            
        print("\n[FAIL] Timed out waiting for sync.")
        return False
        
    except Exception as e:
        print(f"[ERROR] DB Connection Failed: {e}")
        return False

if __name__ == "__main__":
    setup_cloud_item()
    check_local_db()
