
import pyodbc
from datetime import datetime

SQL_SERVER = 'HARSHIL\\PCAMERICA'
SQL_DATABASE = 'cresqlh'

def check_local():
    try:
        conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;'
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        item_num = '87654321'
        print(f"--- Checking Local SQL Server for Item {item_num} ---")
        cursor.execute("SELECT ItemNum, ItemName, Cost, Price, In_Stock FROM Inventory WHERE ItemNum = ?", (item_num,))
        row = cursor.fetchone()
        
        if row:
            print(f"✅ FOUND Local Item:")
            print(f"  ItemNum: {row.ItemNum}")
            print(f"  ItemName: {row.ItemName}")
            print(f"  Cost: {row.Cost}")
            print(f"  Price: {row.Price}")
        else:
            print("❌ Item NOT FOUND in Local SQL!")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_local()
