
import pyodbc
import requests
import json
import configparser

# Load config
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SUPABASE_URL = config.get('supabase', 'url')
SUPABASE_KEY = config.get('supabase', 'key')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE') # Default checking Store H

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

print(f"CHECKING ITEMTYPE VALUES ({SQL_DATABASE})")
print("=" * 60)

conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Get Schema Info
    cursor.execute("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Inventory' AND COLUMN_NAME='ItemType'")
    row = cursor.fetchone()
    print(f"Local SQL 'ItemType' Column Type: {row[0] if row else 'MISSING'}")

    # Inspect Top 5 items
    cursor.execute("SELECT TOP 5 ItemNum, ItemName, ItemType FROM Inventory WHERE ItemType IS NOT NULL")
    local_items = cursor.fetchall()
    
    print("\nComparing First 5 Local Items with Cloud:")
    print(f"{'ItemNum':<15} | {'Name':<20} | {'Local Type':<10} | {'Cloud Type':<10} | {'Match?'}")
    print("-" * 70)
    
    for row in local_items:
        item_num = str(row.ItemNum).strip()
        local_type = row.ItemType
        
        # Fetch from Cloud
        res = requests.get(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{item_num}&select=itemtype,item_name", headers=headers)
        if res.status_code == 200:
            cloud_data = res.json()
            if cloud_data:
                cloud_type = cloud_data[0].get('itemtype', 'N/A')
                match = "✅" if str(local_type) == str(cloud_type) else "❌"
            else:
                cloud_type = "MISSING"
                match = "❌"
        else:
            cloud_type = "ERR"
            match = "❓"

        print(f"{item_num:<15} | {row.ItemName[:20]:<20} | {str(local_type):<10} | {str(cloud_type):<10} | {match}")

    conn.close()

except Exception as e:
    print(f"Error: {e}")
