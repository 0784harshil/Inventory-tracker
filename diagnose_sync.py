"""
Diagnose Two-Way Sync Issue
"""
import pyodbc
import httpx
from configparser import ConfigParser

config = ConfigParser()
config.read('deploy-store-h/config.ini')

SQL_CONN_STR = config.get('database', 'connection_string')
SUPABASE_URL = config.get('supabase', 'url')
SUPABASE_KEY = config.get('supabase', 'key')
CLOUD_STORE_ID = config.get('database', 'cloud_store_id')
LOCAL_STORE_ID = config.get('database', 'local_store_id', fallback='1001')

print('=== DIAGNOSIS ===')
print('Cloud Store ID:', CLOUD_STORE_ID)
print('Local Store ID:', LOCAL_STORE_ID)

# Check Supabase for BIDIR-TEST-001
headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json'
}

with httpx.Client(timeout=30) as client:
    response = client.get(
        SUPABASE_URL + '/rest/v1/inventory?item_num=eq.BIDIR-TEST-001',
        headers=headers
    )
    items = response.json()
    print('')
    print('Supabase BIDIR-TEST-001:', len(items), 'found')
    if items:
        for item in items:
            print('  store_id:', item['store_id'], '  in_stock:', item['in_stock'])

# Check local SQL Server for BIDIR-TEST-001
conn = pyodbc.connect(SQL_CONN_STR)
cursor = conn.cursor()
cursor.execute("SELECT ItemNum, Store_ID, In_Stock FROM Inventory WHERE ItemNum = 'BIDIR-TEST-001'")
rows = cursor.fetchall()
print('')
print('Local SQL BIDIR-TEST-001:', len(rows), 'found')
for row in rows:
    print('  ItemNum:', row[0], '  Store_ID:', row[1], '  In_Stock:', row[2])

# Check total count in cloud vs local
with httpx.Client(timeout=30) as client:
    response = client.get(
        SUPABASE_URL + '/rest/v1/inventory?store_id=eq.' + CLOUD_STORE_ID + '&select=item_num',
        headers=headers
    )
    cloud_items = response.json()
    print('')
    print('Cloud items for', CLOUD_STORE_ID + ':', len(cloud_items))

cursor.execute("SELECT COUNT(*) FROM Inventory WHERE Store_ID = ?", (LOCAL_STORE_ID,))
local_count = cursor.fetchone()[0]
print('Local items for Store_ID', LOCAL_STORE_ID + ':', local_count)

# Check if BIDIR-TEST-001 is in cloud items
cloud_item_nums = {str(item['item_num']).strip() for item in cloud_items}
print('')
print('Is BIDIR-TEST-001 in cloud items?', 'BIDIR-TEST-001' in cloud_item_nums)

cursor.close()
conn.close()
