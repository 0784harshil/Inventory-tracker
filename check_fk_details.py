
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')

SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
WINDOWS_AUTH = config.getboolean('SETTINGS', 'WINDOWS_AUTH')
SQL_USER = config.get('SETTINGS', 'SQL_USER', fallback=None)
SQL_PASSWORD = config.get('SETTINGS', 'SQL_PASSWORD', fallback=None)

def get_sql_connection():
    if WINDOWS_AUTH:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
    else:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};'
    return pyodbc.connect(conn_str)

try:
    conn = get_sql_connection()
    cursor = conn.cursor()
    query = """
    SELECT 
        fk.name AS ForeignKey,
        tp.name AS ParentTable,
        cp.name AS ParentColumn,
        tr.name AS ReferencedTable,
        cr.name AS ReferencedColumn
    FROM 
        sys.foreign_keys fk
    INNER JOIN 
        sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN 
        sys.tables tp ON fkc.parent_object_id = tp.object_id
    INNER JOIN 
        sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
    INNER JOIN 
        sys.tables tr ON fkc.referenced_object_id = tr.object_id
    INNER JOIN 
        sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
    WHERE 
        tp.name = 'Inventory'
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    print(f"{'ForeignKey':<30} {'ParentTable':<20} {'ParentCol':<15} {'RefTable':<20} {'RefCol':<15}")
    print("-" * 100)
    for row in rows:
        print(f"{row[0]:<30} {row[1]:<20} {row[2]:<15} {row[3]:<20} {row[4]:<15}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
