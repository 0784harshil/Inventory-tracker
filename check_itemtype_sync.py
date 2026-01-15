
import os
import pyodbc
import requests
import configparser
import json

# Load credentials
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL") or config.get('supabase', 'url', fallback=None)
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or config.get('supabase', 'key', fallback=None)

# SQL Server (SETTINGS section)
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
WINDOWS_AUTH = config.getboolean('SETTINGS', 'WINDOWS_AUTH')
SQL_USER = config.get('SETTINGS', 'SQL_USER', fallback=None)
SQL_PASSWORD = config.get('SETTINGS', 'SQL_PASSWORD', fallback=None)

def get_sql_connection():
    if WINDOWS_AUTH:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
    else:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};'
    return pyodbc.connect(conn_str)

ITEM_NUM = 'TEST-WEB-02'
EXPECTED_TYPE = 9

print(f"Checking Item: {ITEM_NUM}")
print(f"Expected ItemType: {EXPECTED_TYPE}")
print("-" * 30)

# Check Supabase
try:
    print("Checking Supabase...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    url = f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{ITEM_NUM}&select=*"
    response = requests.get(url, headers=headers)
    data = response.json()
    
    if data:
        item = data[0]
        # Supabase column is 'itemtype'
        actual_type = item.get('itemtype')
        print(f"✅ Found in Supabase.")
        print(f"   ItemType: {actual_type}")
        if actual_type == EXPECTED_TYPE:
             print("   MATCH: Supabase ItemType matches expected.")
        else:
             print(f"   MISMATCH: Supabase has {actual_type}, expected {EXPECTED_TYPE}")
    else:
        print("❌ Not found in Supabase.")
        print(f"Response: {response.text}")
except Exception as e:
    print(f"Error checking Supabase: {e}")

print("-" * 30)

# Check SQL Server
try:
    print("Checking SQL Server...")
    conn = get_sql_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ItemNum, ItemName, ItemType FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
    row = cursor.fetchone()
    if row:
        print(f"✅ Found in SQL Server.")
        print(f"   ItemType: {row.ItemType}")
        if row.ItemType == EXPECTED_TYPE:
             print("   MATCH: SQL Server ItemType matches expected.")
        else:
             print(f"   MISMATCH: SQL Server has {row.ItemType}, expected {EXPECTED_TYPE}")
    else:
        print("❌ Not found in SQL Server (Wait for sync agent to run).")
    conn.close()
except Exception as e:
    print(f"Error checking SQL Server: {e}")
