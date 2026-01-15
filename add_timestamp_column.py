
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
    
    # Step 1: Check if column exists
    print("Checking if Local_Updated_At column exists...")
    cursor.execute("""
        SELECT 1 FROM sys.columns 
        WHERE object_id = OBJECT_ID('Inventory') AND name = 'Local_Updated_At'
    """)
    exists = cursor.fetchone()
    
    if exists:
        print("✅ Column already exists!")
    else:
        print("Adding Local_Updated_At column...")
        try:
            cursor.execute("""
                ALTER TABLE Inventory ADD Local_Updated_At DATETIME DEFAULT GETDATE()
            """)
            conn.commit()
            print("✅ Column added successfully!")
        except Exception as e:
            print(f"❌ Failed to add column: {e}")
    
    # Step 2: Create/Update trigger
    print("\nCreating update trigger...")
    try:
        # First drop if exists
        cursor.execute("""
            IF EXISTS (SELECT 1 FROM sys.triggers WHERE name = 'trg_Inventory_UpdateTimestamp')
                DROP TRIGGER trg_Inventory_UpdateTimestamp
        """)
        conn.commit()
        
        cursor.execute("""
            CREATE TRIGGER trg_Inventory_UpdateTimestamp
            ON Inventory
            AFTER UPDATE
            AS
            BEGIN
                SET NOCOUNT ON;
                UPDATE Inventory 
                SET Local_Updated_At = GETDATE()
                FROM Inventory i
                INNER JOIN inserted ins ON i.ItemNum = ins.ItemNum;
            END
        """)
        conn.commit()
        print("✅ Trigger created successfully!")
    except Exception as e:
        print(f"❌ Failed to create trigger: {e}")
    
    # Step 3: Initialize existing rows
    print("\nInitializing timestamps for existing rows...")
    try:
        cursor.execute("""
            UPDATE Inventory SET Local_Updated_At = GETDATE() 
            WHERE Local_Updated_At IS NULL
        """)
        count = cursor.rowcount
        conn.commit()
        print(f"✅ Initialized {count} rows")
    except Exception as e:
        print(f"❌ Failed to initialize: {e}")
    
    conn.close()
    print("\n✅ Schema update complete!")
    
except Exception as e:
    print(f"❌ Connection error: {e}")
