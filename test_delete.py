
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')

conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

item_num = '87654321'

# Try to delete
print(f"Attempting to DELETE item {item_num} from local SQL...")
try:
    cursor.execute("DELETE FROM Inventory WHERE ItemNum = ?", item_num)
    conn.commit()
    print(f"✅ Successfully DELETED item {item_num}")
except Exception as e:
    print(f"❌ DELETE failed: {e}")
    print("Trying UPDATE fallback...")
    try:
        cursor.execute("UPDATE Inventory SET ItemName = '[DELETED] ' + LEFT(ItemName, 15), In_Stock = 0 WHERE ItemNum = ?", item_num)
        conn.commit()
        print(f"✅ Successfully MARKED item as [DELETED]")
    except Exception as e2:
        print(f"❌ UPDATE also failed: {e2}")

conn.close()
