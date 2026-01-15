
import pyodbc
import configparser

config = configparser.ConfigParser()
config.read('sync-agents/config.ini', encoding='utf-8')

SQL_SERVER = config.get('SETTINGS', 'SQL_SERVER')
SQL_DATABASE = config.get('SETTINGS', 'SQL_DATABASE')
WINDOWS_AUTH = config.getboolean('SETTINGS', 'WINDOWS_AUTH')
SQL_USER = config.get('SETTINGS', 'SQL_USER', fallback=None)
SQL_PASSWORD = config.get('SETTINGS', 'SQL_PASSWORD', fallback=None)

def get_conn():
    if WINDOWS_AUTH:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};Trusted_Connection=yes;'
    else:
        conn_str = f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};'
    return pyodbc.connect(conn_str)

ITEM_NUM = 'TEST-MANUAL-01'

def try_insert(dept_id, store_id):
    print(f"--- Trying -> Dept: '{dept_id}' | Store: '{store_id}' ---")
    conn = get_conn()
    cursor = conn.cursor()
    try:
        # Delete if exists
        cursor.execute("DELETE FROM Inventory WHERE ItemNum = ?", ITEM_NUM)
        
        # INSERT
        cursor.execute("""
            INSERT INTO Inventory (
                ItemNum, ItemName, Price, Cost, Dept_ID, In_Stock, ItemType,
                Store_ID, Reorder_Level, Reorder_Quantity, Tax_1, Tax_2, Tax_3, 
                IsKit, IsModifier, Inv_Num_Barcode_Labels, Use_Serial_Numbers, 
                Num_Bonus_Points, IsRental, Use_Bulk_Pricing, Print_Ticket, 
                Print_Voucher, Num_Days_Valid, IsMatrixItem, AutoWeigh, Dirty, 
                FoodStampable, Exclude_Acct_Limit, Check_ID, Prompt_Price, 
                Prompt_Quantity, Allow_BuyBack, Special_Permission, Prompt_Description, 
                Check_ID2, Count_This_Item, Print_On_Receipt, Transfer_Markup_Enabled, 
                As_Is
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, 0, 0, 0, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0,
                0, 1, 1, 0,
                0
            )
        """, (ITEM_NUM, 'Manual Test Item', 10.0, 5.0, dept_id, 100, 0, store_id))
        conn.commit()
        print("✅ SUCCESS")
    except Exception as e:
        print(f"❌ FAILED: {e}")
    finally:
        conn.close()

try_insert('MISC', 'STORE-H')
try_insert('MISC ', 'STORE-H')
try_insert('MISC ', '1001')
