
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
    cursor.execute("SELECT Dept_ID FROM Departments WHERE Dept_ID LIKE 'NONE%'")
    rows = cursor.fetchall()
    print("Found 'NONE' departments:")
    for row in rows:
        did = row.Dept_ID
        print(f"'{did}' (Len: {len(did)})")
    conn.close()
except Exception as e:
    print(f"Error: {e}")
