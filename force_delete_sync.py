
import pyodbc
import requests
import configparser

# Load config
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SUPABASE_URL = config.get('supabase', 'url')
SUPABASE_KEY = config.get('supabase', 'key')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
STORE_ID = config.get('SETTINGS', 'CLOUD_STORE_ID')

headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}

print(f"Checking for DELETED items to process for STORE: {STORE_ID}...")

# Fetch items marked as DELETED from Cloud
res = requests.get(f"{SUPABASE_URL}/rest/v1/inventory?item_name=eq.DELETED&store_id=eq.{STORE_ID}", headers=headers)
items = res.json()

print(f"Found {len(items)} items marked DELETED in Cloud for {STORE_ID}")

if items:
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    for item in items:
        item_num = item['item_num']
        print(f"\nProcessing {item_num}...")
        
        # Check if exists locally
        cursor.execute("SELECT ItemNum FROM Inventory WHERE ItemNum = ?", item_num)
        if cursor.fetchone():
            # Try to delete
            try:
                cursor.execute("DELETE FROM Inventory WHERE ItemNum = ?", item_num)
                conn.commit()
                print(f"  ✅ Deleted {item_num} from local DB")
                
                # Also delete from Cloud
                requests.delete(f"{SUPABASE_URL}/rest/v1/inventory?item_num=eq.{item_num}&store_id=eq.{STORE_ID}", headers=headers)
                print(f"  ✅ Cleaned up {item_num} from Cloud")
            except Exception as e:
                print(f"  ❌ Failed to delete: {e}")
        else:
            print(f"  Already deleted locally")
    
    conn.close()
else:
    print("No items to process.")
