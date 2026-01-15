
import pyodbc
import requests
import json
import configparser

ITEM_NUM = "009016019334"

# Load config
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SUPABASE_URL = config.get('supabase', 'url')
SUPABASE_KEY = config.get('supabase', 'key')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

print(f"CHECKING ITEM: {ITEM_NUM}")
print("=" * 60)

# Local
conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT ItemName, ItemType, In_Stock, Cost, Price, Local_Updated_At FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
    row = cursor.fetchone()
    conn.close()
    
    if row:
        print(f"LOCAL SQL:")
        print(f" - Name: {row.ItemName}")
        print(f" - Cost: {row.Cost}")
        print(f" - Price: {row.Price}")
        print(f" - ItemType: {row.ItemType}")
        print(f" - Updated: {row.Local_Updated_At}")
    else:
        print("LOCAL SQL: ❌ Item NOT FOUND")

except Exception as e:
    print(f"Local Error: {e}")

# Cloud
print("-" * 30)
res = requests.get(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{ITEM_NUM}", headers=headers)
if res.status_code == 200:
    items = res.json()
    if items:
        i = items[0]
        print(f"CLOUD (Supabase):")
        print(f" - Name: {i.get('item_name')}")
        print(f" - Store: {i.get('store_id')}")
        print(f" - Cost: {i.get('cost')}")
        print(f" - Price: {i.get('price')}")
        print(f" - ItemType: {i.get('itemtype')}")
        print(f" - Updated: {i.get('updated_at')}")
        print(f" - Is Deleted? {i.get('item_name') == 'DELETED'}")
    else:
        print("CLOUD: ❌ Item NOT FOUND")
else:
    print(f"Cloud Error: {res.status_code}")
