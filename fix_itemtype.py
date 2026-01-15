
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')

conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Fix ItemType null to 0
cursor.execute("UPDATE Inventory SET ItemType = 0 WHERE ItemNum = '987654321' AND ItemType IS NULL")
conn.commit()
print("Fixed ItemType to 0 for item 987654321")
conn.close()
