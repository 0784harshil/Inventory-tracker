
import pyodbc
import configparser
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--item', required=True)
parser.add_argument('--qty', required=True)
parser.add_argument('--db', default='cresqlh')
args = parser.parse_args()

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')
SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')

print(f"Updating {args.item} to Stock {args.qty} in {args.db}...")

conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={args.db};Trusted_Connection=yes;'
try:
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("UPDATE Inventory SET In_Stock = ? WHERE ItemNum = ?", (args.qty, args.item))
    conn.commit()
    print("✅ Update Successful")
    conn.close()
except Exception as e:
    print(f"❌ Failed: {e}")
