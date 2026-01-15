
import pyodbc
from datetime import datetime

SQL_SERVER = 'HARSHIL\\PCAMERICA'
SQL_DATABASE = 'cresqlh'

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)

def inspect():
    try:
        conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;'
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        log("--- Departments Table Columns ---")
        cursor.execute("SELECT TOP 1 * FROM Departments")
        for col in cursor.description:
            print(f"  {col[0]}", flush=True)
            
        log("\n--- Inventory Table Columns ---")
        cursor.execute("SELECT TOP 1 * FROM Inventory")
        for col in cursor.description:
            print(f"  {col[0]}", flush=True)

        conn.close()
    except Exception as e:
        log(f"Error: {e}")

if __name__ == "__main__":
    inspect()
