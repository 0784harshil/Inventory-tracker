
import pyodbc
import configparser

# Load credentials
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
    # Query for columns that are NOT NULL and don't have defaults
    query = """
    SELECT 
        c.name 'Column Name',
        t.Name 'Data Type',
        c.is_nullable,
        ISNULL(i.text, '') 'Default Value'
    FROM    
        sys.columns c
    INNER JOIN 
        sys.types t ON c.user_type_id = t.user_type_id
    LEFT OUTER JOIN 
        syscomments i ON c.default_object_id = i.id
    WHERE
        object_id = OBJECT_ID('Inventory')
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    print(f"{'Column Name':<20} {'Nullable':<10} {'Default':<20}")
    print("-" * 50)
    for row in rows:
        col_name = row[0]
        is_nullable = row[2]
        default_val = row[3]
        if not is_nullable and not default_val:
            print(f"{col_name:<20} {is_nullable:<10} (NO DEFAULT)")
        else:
            # print(f"{col_name:<20} {is_nullable:<10} {default_val:<20}")
            pass

    conn.close()
except Exception as e:
    print(f"Error: {e}")
