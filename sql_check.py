
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')

SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'

try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT ItemNum, ItemName, Dept_ID, In_Stock, Store_ID FROM Inventory WHERE ItemNum = '54321'")
    rows = cursor.fetchall()
    if rows:
        print("Found in SQL Server:")
        for row in rows:
            print(f"  {row.ItemNum} | {row.ItemName} | Store: {row.Store_ID} | Dept: {row.Dept_ID} | Stock: {row.In_Stock}")
    else:
        print("NOT FOUND in SQL Server")
    conn.close()
except Exception as e:
    print(f"ERROR: {e}")
