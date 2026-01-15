
import pyodbc
SQL_SERVER = 'HARSHIL\\PCAMERICA'
SQL_DATABASE = 'cresqlh'

def check():
    try:
        conn_str = f'DRIVER={{SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;TrustServerCertificate=yes;'
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("SELECT TOP 1 ItemType FROM Inventory")
        row = cursor.fetchone()
        print(f"✅ ItemType Column Exists. Sample value: {row.ItemType if row else 'None'}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check()
