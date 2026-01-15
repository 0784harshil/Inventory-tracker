
import requests
import pyodbc
import configparser

ITEM_NUM = "TEST-WEB-02"
EXPECTED_TYPE = 12

# Supabase
SUPABASE_URL = "https://xsyduihbgizgfvqucioq.supabase.co"
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SUPABASE_KEY = config.get('supabase', 'key')

print(f"Checking Item: {ITEM_NUM}")
print(f"Expected ItemType: {EXPECTED_TYPE}")
print("-" * 30)

# Check Supabase
print("Checking Supabase...")
headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
res = requests.get(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{ITEM_NUM}", headers=headers)
if res.status_code == 200:
    items = res.json()
    if items:
        item_type = items[0].get('itemtype')
        print(f"OK: Found. ItemType = {item_type}")
    else:
        print("NOT FOUND in Supabase")
else:
    print(f"ERROR: {res.status_code}")
print("-" * 30)

# Check SQL Server
print("Checking SQL Server...")
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT ItemType FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
    row = cursor.fetchone()
    if row:
        print(f"OK: Found. ItemType = {row.ItemType}")
    else:
        print("NOT FOUND in SQL Server")
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
