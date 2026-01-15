
import pyodbc
import requests
import configparser

ITEM_NUM = "54321"

# Config
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SUPABASE_URL = "https://xsyduihbgizgfvqucioq.supabase.co"
SUPABASE_KEY = config.get('supabase', 'key')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')

print(f"Comparing item {ITEM_NUM} between SQL Server and Supabase")
print("=" * 60)

# SQL Server
print("\n[SQL Server - LOCAL]")
conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT ItemNum, ItemName, In_Stock, Price, Cost FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
    row = cursor.fetchone()
    if row:
        print(f"  ItemNum:  {row.ItemNum}")
        print(f"  ItemName: {row.ItemName}")
        print(f"  In_Stock: {row.In_Stock}")
        print(f"  Price:    {row.Price}")
        print(f"  Cost:     {row.Cost}")
    else:
        print("  NOT FOUND")
    conn.close()
except Exception as e:
    print(f"  ERROR: {e}")

# Supabase
print("\n[Supabase - CLOUD]")
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
res = requests.get(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{ITEM_NUM}&store_id=eq.STORE-H", headers=headers)
if res.status_code == 200:
    items = res.json()
    if items:
        item = items[0]
        print(f"  item_num:  {item.get('item_num')}")
        print(f"  item_name: {item.get('item_name')}")
        print(f"  in_stock:  {item.get('in_stock')}")
        print(f"  price:     {item.get('price')}")
        print(f"  cost:      {item.get('cost')}")
    else:
        print("  NOT FOUND for STORE-H")
else:
    print(f"  ERROR: {res.status_code}")
