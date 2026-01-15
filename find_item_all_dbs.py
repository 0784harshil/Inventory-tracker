
import pyodbc
import configparser

ITEM_NUM = "080686833178"

# Load config
config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
print(f"CONFIG says sync to: {SQL_DATABASE}")
print("=" * 60)

# Check ALL databases for this item
DATABASES = ['cresql', 'cresqlh', 'cresqlk', 'cresqldekalb', 'cresqlp', 'cresqlpridom']

for db in DATABASES:
    conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={db};Trusted_Connection=yes;'
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT ItemNum, ItemName, ItemType, In_Stock FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
        row = cursor.fetchone()
        if row:
            print(f"✅ FOUND in {db}: {row.ItemName} (ItemType: {row.ItemType}, Stock: {row.In_Stock})")
        else:
            print(f"❌ NOT FOUND in {db}")
        conn.close()
    except Exception as e:
        print(f"⚠️  Cannot check {db}: {e}")
