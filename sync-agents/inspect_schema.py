
import pyodbc
import os
import configparser

# Load Config
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, 'config-k.ini')

def read_config():
    config = configparser.ConfigParser()
    if os.path.exists(CONFIG_FILE):
        config.read(CONFIG_FILE)
        if 'SETTINGS' in config:
            return config['SETTINGS']
    return {}

CONF = read_config()
SQL_SERVER = CONF.get('SQL_SERVER', 'HARSHIL\\PCAMERICA')
DATABASE = CONF.get('SQL_DATABASE', 'cresqlk')

def inspect():
    try:
        conn = pyodbc.connect(
            f'DRIVER={{ODBC Driver 17 for SQL Server}};'
            f'SERVER={SQL_SERVER};'
            f'DATABASE={DATABASE};'
            f'Trusted_Connection=yes;'
        )
        cursor = conn.cursor()
        
        print(f"--- Columns in 'Inventory' ---")
        cursor.execute("SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Inventory'")
        for row in cursor.fetchall():
            print(f" - {row.COLUMN_NAME} ({row.DATA_TYPE}, Nullable: {row.IS_NULLABLE})")

        print(f"\n--- Foreign Keys on 'Departments' ---")
        cursor.execute("""
            SELECT 
                fk.name AS FK_Name,
                tp.name AS Parent_Table,
                ref.name AS Referenced_Table,
                c.name AS Column_Name
            FROM sys.foreign_keys AS fk
            INNER JOIN sys.tables AS tp ON fk.parent_object_id = tp.object_id
            INNER JOIN sys.tables AS ref ON fk.referenced_object_id = ref.object_id
            INNER JOIN sys.foreign_key_columns AS fkc ON fk.object_id = fkc.constraint_object_id
            INNER JOIN sys.columns AS c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
            WHERE tp.name = 'Departments'
        """)
        for row in cursor.fetchall():
            print(f" - FK: {row.FK_Name} | Col: {row.Column_Name} -> Ref: {row.Referenced_Table}")

        print(f"\n--- Data in 'Categories' ---")
        try:
            cursor.execute("SELECT TOP 5 * FROM Categories")
            cols = [column[0] for column in cursor.description]
            print(f"Cols: {cols}")
            for row in cursor.fetchall():
                print(row)
        except Exception as e:
            print(f"Could not read Categories: {e}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
