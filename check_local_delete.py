
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')

conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

cursor.execute("SELECT ItemNum, ItemName FROM Inventory WHERE ItemNum = '87654321'")
row = cursor.fetchone()
if row:
    print(f"LOCAL: Item 87654321 EXISTS - Name: {row.ItemName}")
else:
    print("LOCAL: Item 87654321 has been DELETED ✅")
conn.close()
