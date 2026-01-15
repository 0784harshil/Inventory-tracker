
import pyodbc
import requests
import time
import os
import json

# Config
SQL_SERVER = 'HARSHIL\\PCAMERICA'
SQL_DATABASE = 'cresqlh'
ITEM_NUM = '87654321'

# Load Supabase manual config
config = {}
try:
    with open('deploy-store-h/config.ini', 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                config[key.strip()] = val.strip()
except:
    # Try current dir
    with open('config.ini', 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                key, val = line.strip().split('=', 1)
                config[key.strip()] = val.strip()

SUPABASE_URL = config.get('url')
SUPABASE_KEY = config.get('key')
STORE_ID = 'STORE-H'

def get_local_price():
    try:
        conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;'
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        # Try to select ItemType, might fail if column not added yet
        try:
            cursor.execute("SELECT Cost, Price, ItemType FROM Inventory WHERE ItemNum = ?", (ITEM_NUM,))
        except:
            cursor.execute("SELECT Cost, Price FROM Inventory WHERE ItemNum = ?", (ITEM_NUM,))
            row = cursor.fetchone()
            conn.close()
            if row: return float(row.Cost), float(row.Price), 0
            return None, None, 0

        row = cursor.fetchone()
        conn.close()
        if row: return float(row.Cost), float(row.Price), int(row.ItemType or 0)
    except: pass
    return None, None, 0

def get_cloud_price():
    try:
        headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
        url = f"{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&item_num=eq.{ITEM_NUM}&select=cost,price,item_type"
        res = requests.get(url, headers=headers)
        if res.status_code == 200:
            data = res.json()
            if data: return float(data[0]['cost']), float(data[0]['price']), int(data[0].get('itemtype', 0))
    except: pass
    return None, None, 0

def monitor():
    print(f"👀 Monitoring Item {ITEM_NUM} Sync (Local -> Cloud)...")
    print(f"{'TIME':<10} | {'LOCAL $':<10} | {'CLOUD $':<10} | {'TYPE (L)':<8} | {'TYPE (C)':<8} | {'STATUS'}")
    print("-" * 75)
    
    last_local = None
    last_cloud = None
    
    while True:
        local_cost, _, local_type = get_local_price()
        cloud_cost, _, cloud_type = get_cloud_price()
        
        timestamp = time.strftime("%H:%M:%S")
        status = "✅ Synced" if (local_cost == cloud_cost and local_type == cloud_type) else "⏳ Syncing..."
        
        # Always print if changed
        if (local_cost, local_type) != last_local or (cloud_cost, cloud_type) != last_cloud:
            print(f"{timestamp:<10} | ${local_cost or 0:<9} | ${cloud_cost or 0:<9} | {local_type:<8} | {cloud_type:<8} | {status}")
            last_local = (local_cost, local_type)
            last_cloud = (cloud_cost, cloud_type)
            
        time.sleep(2)

if __name__ == "__main__":
    monitor()
