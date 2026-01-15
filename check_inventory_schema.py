
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
        c.name,
        t.Name 'Type',
        c.max_length
    FROM    
        sys.columns c
    INNER JOIN 
        sys.types t ON c.user_type_id = t.user_type_id
    WHERE
        object_id = OBJECT_ID('Inventory')
    """
    cursor.execute(query)
    rows = cursor.fetchall()
    print(f"{'Column':<20} {'Type':<10} {'Length':<10}")
    print("-" * 40)
    for row in rows:
        print(f"{row[0]:<20} {row[1]:<10} {row[2]:<10}")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
