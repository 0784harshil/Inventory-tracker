
import requests
import time
import os
import configparser
import pyodbc
from datetime import datetime, timezone

# --- CONFIG LOADING ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FILE_H = os.path.join(BASE_DIR, 'config.ini')
FILE_K = os.path.join(BASE_DIR, 'config-k.ini')

def load_settings(file_path):
    c = configparser.ConfigParser()
    if os.path.exists(file_path): c.read(file_path)
    return c['SETTINGS'] if 'SETTINGS' in c else {}, c['supabase'] if 'supabase' in c else {}

SET_H, SUP_H = load_settings(FILE_H)
SET_K, SUP_K = load_settings(FILE_K)

# Shared Supabase Check
SUPABASE_URL = SUP_H.get('url', '')
SUPABASE_KEY = SUP_H.get('key', '')
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# DB Clients
def get_cursor(settings):
    server = settings.get('SQL_SERVER', 'HARSHIL\\PCAMERICA')
    db = settings.get('SQL_DATABASE', '')
    conn = pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={server};DATABASE={db};Trusted_Connection=yes;')
    return conn, conn.cursor()

# Test Data
ITEM_NUM = "TEST_TR_01"
QTY = 10
STORE_H_ID_CLOUD = SET_H.get('CLOUD_STORE_ID', 'STORE-H')
STORE_H_ID_LOCAL = '1001' # Assumption, or fetch dynamic? will fetch dynamic.
STORE_K_ID_CLOUD = SET_K.get('CLOUD_STORE_ID', 'STORE-K')

def prime_local_dbs():
    print("1. Priming Local Databases...")
    
    # Store H (Source) - Needs Stock
    try:
        conn_h, cur_h = get_cursor(SET_H)
        # Get Local Store ID dynamic
        cur_h.execute("SELECT TOP 1 Store_ID FROM Setup")
        sid_h = cur_h.fetchone()[0]
        
        # Upsert Item with Defaults for all NOT NULL columns
        cur_h.execute("DELETE FROM Inventory WHERE ItemNum=?", (ITEM_NUM,))
        cur_h.execute("""
            INSERT INTO Inventory (
                ItemNum, ItemName, Cost, Price, In_Stock, Store_ID, Dept_ID,
                Reorder_Level, Reorder_Quantity, Tax_1, Tax_2, Tax_3, IsKit, IsModifier, 
                Inv_Num_Barcode_Labels, Use_Serial_Numbers, Num_Bonus_Points, IsRental,
                Use_Bulk_Pricing, Print_Ticket, Print_Voucher, Num_Days_Valid, IsMatrixItem,
                AutoWeigh, Dirty, FoodStampable, Exclude_Acct_Limit, Check_ID, Prompt_Price,
                Prompt_Quantity, Allow_BuyBack, Special_Permission, Prompt_Description,
                Check_ID2, Count_This_Item, Print_On_Receipt, Transfer_Markup_Enabled, As_Is,
                Import_Markup, PricePerMeasure, AvailableOnline, DoughnutTax, RowID,
                DisableInventoryUpload, InvoiceLimitQty, ItemCategory, IsRestrictedPerInvoice,
                Retail_Price
            ) VALUES (
                ?, 'Test Transfer Item', 1.0, 2.0, 100, ?, 'NONE',
                0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 1, 0, 0, 0, 0,
                0, 0, 0, 0,
                0, 1, 1, 0, 0,
                0, 0, 1, 0, NEWID(),
                0, 0, 0, 0,
                2.0
            )""", (ITEM_NUM, sid_h))
        conn_h.commit()
        print(f"   [H] Stock set to 100 for {ITEM_NUM}")
        conn_h.close()
    except Exception as e:
        print(f"   [ERROR H] {e}")
        return False

    # Store K (Dest) - Start with 0
    try:
        conn_k, cur_k = get_cursor(SET_K)
        cur_k.execute("SELECT TOP 1 Store_ID FROM Setup")
        sid_k = cur_k.fetchone()[0]
        
        cur_k.execute("DELETE FROM Inventory WHERE ItemNum=?", (ITEM_NUM,))
        cur_k.execute("""
            INSERT INTO Inventory (
                ItemNum, ItemName, Cost, Price, In_Stock, Store_ID, Dept_ID,
                Reorder_Level, Reorder_Quantity, Tax_1, Tax_2, Tax_3, IsKit, IsModifier, 
                Inv_Num_Barcode_Labels, Use_Serial_Numbers, Num_Bonus_Points, IsRental,
                Use_Bulk_Pricing, Print_Ticket, Print_Voucher, Num_Days_Valid, IsMatrixItem,
                AutoWeigh, Dirty, FoodStampable, Exclude_Acct_Limit, Check_ID, Prompt_Price,
                Prompt_Quantity, Allow_BuyBack, Special_Permission, Prompt_Description,
                Check_ID2, Count_This_Item, Print_On_Receipt, Transfer_Markup_Enabled, As_Is,
                Import_Markup, PricePerMeasure, AvailableOnline, DoughnutTax, RowID,
                DisableInventoryUpload, InvoiceLimitQty, ItemCategory, IsRestrictedPerInvoice,
                Retail_Price
            ) VALUES (
                ?, 'Test Transfer Item', 1.0, 2.0, 0, ?, 'NONE',
                0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0,
                0, 0, 0, 0, 0,
                0, 1, 0, 0, 0, 0,
                0, 0, 0, 0,
                0, 1, 1, 0, 0,
                0, 0, 1, 0, NEWID(),
                0, 0, 0, 0,
                2.0
            )""", (ITEM_NUM, sid_k))
        conn_k.commit()
        print(f"   [K] Stock set to 0 for {ITEM_NUM}")
        conn_k.close()
    except Exception as e:
        print(f"   [ERROR K] {e}")
        return False
        
    return True

def create_transfer():
    print("2. Creating Approved Transfer in Cloud (H -> K)...")
    
    # 1. Create Header
    payload_header = {
        "transfer_number": f"TRF-{int(time.time())}", 
        "from_store_id": STORE_H_ID_CLOUD,
        "to_store_id": STORE_K_ID_CLOUD,
        "status": "approved", # Ready for H to pick up
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    res = requests.post(f"{SUPABASE_URL}/rest/v1/transfers", headers=HEADERS, json=payload_header, params={"select": "id"})
    
    if res.status_code == 201:
        data = res.json()
        tid = data[0]['id']
        print(f"   [Header] Transfer Created. ID: {tid}")
        
        # 2. Create Item
        payload_item = {
            "transfer_id": tid,
            "item_num": ITEM_NUM,
            "quantity": QTY,
            "item_name": "Test Transfer Item"
        }
        res2 = requests.post(f"{SUPABASE_URL}/rest/v1/transfer_items", headers=HEADERS, json=payload_item)
        if res2.status_code == 201:
             print(f"   [Item] Transfer Item Created.")
             return tid
        else:
             print(f"   [FAIL Item] {res2.text}")
             return None
    else:
        print(f"   [FAIL Header] {res.text}")
        return None

def monitor_transfer(tid):
    print("3. Monitoring Sync Agents...")
    
    step_h_done = False
    step_k_done = False
    
    for i in range(120): # 10 mins max
        print(f"   Check {i+1}/120...")
        
        # Check Cloud Status
        res = requests.get(f"{SUPABASE_URL}/rest/v1/transfers?id=eq.{tid}", headers=HEADERS)
        if res.status_code == 200 and res.json():
            t = res.json()[0]
            status = t['status']
            print(f"   -> Cloud Status: {status}")
            
            if status == 'in_transit' and not step_h_done:
                print("   [H] Handled Transfer! (Status -> in_transit)")
                step_h_done = True
                
            if status == 'completed':
                print("   [K] Handled Transfer! (Status -> completed)")
                step_k_done = True
                break
        
        time.sleep(5)
        
    if step_k_done:
        print("\n[VERIFIED] Full Cycle Successful!")
        # Validate Stocks
        verify_stocks()
    else:
        print("\n[FAIL] Transfer timed out.")

def verify_stocks():
    print("4. Validating Final Stocks...")
    # Expect H=90, K=10
    try:
        conn_h, cur_h = get_cursor(SET_H)
        cur_h.execute("SELECT In_Stock FROM Inventory WHERE ItemNum=?", (ITEM_NUM,))
        stock_h = cur_h.fetchone()[0]
        print(f"   [H] Final Stock: {stock_h} (Expected: 90) -> {'PASS' if stock_h==90 else 'FAIL'}")
        
        conn_k, cur_k = get_cursor(SET_K)
        cur_k.execute("SELECT In_Stock FROM Inventory WHERE ItemNum=?", (ITEM_NUM,))
        stock_k = cur_k.fetchone()[0]
        print(f"   [K] Final Stock: {stock_k} (Expected: 10) -> {'PASS' if stock_k==10 else 'FAIL'}")
        
    except Exception as e:
        print(f"   [ERROR] Stock check failed: {e}")

def setup_cloud_item():
    print("1b. Injecting Item into Cloud (Store H)...")
    payload = {
        "item_num": ITEM_NUM,
        "item_name": "Test Transfer Item",
        "store_id": STORE_H_ID_CLOUD,
        "dept_id": "NONE",
        "itemtype": 0,
        "in_stock": 100,
        "cost": 1.0,
        "price": 2.0,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    # Upsert
    requests.post(f"{SUPABASE_URL}/rest/v1/inventory", headers=HEADERS, json=payload)

if __name__ == "__main__":
    if prime_local_dbs():
        setup_cloud_item()
        tid = create_transfer()
        if tid:
            monitor_transfer(tid)
