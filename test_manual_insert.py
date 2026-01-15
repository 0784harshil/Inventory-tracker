"""
Test manual insert to local database
"""
import pyodbc
from configparser import ConfigParser

config = ConfigParser()
config.read('deploy-store-h/config.ini')
SQL_CONN_STR = config.get('database', 'connection_string')
LOCAL_STORE_ID = config.get('database', 'local_store_id', fallback='1001')

# Test inserting the item manually
conn = pyodbc.connect(SQL_CONN_STR)
cursor = conn.cursor()

item = {
    'item_num': 'BIDIR-TEST-001',
    'item_name': 'Bidirectional Sync Test',
    'cost': 10.00,
    'price': 20.00,
    'retail_price': 20.00,
    'in_stock': 250,
    'reorder_level': 0,
    'reorder_quantity': 0,
    'dept_id': 'TEST',
    'vendor_number': None,
    'unit_type': None,
    'unit_size': None
}

print('Testing manual insert...')
print('Store ID:', LOCAL_STORE_ID)
try:
    insert_query = """
        INSERT INTO Inventory (
            ItemNum, ItemName, Store_ID, Cost, Price, Retail_Price, In_Stock,
            Reorder_Level, Reorder_Quantity, Dept_ID, Vendor_Number,
            Unit_Type, Unit_Size,
            Tax_1, Tax_2, Tax_3,
            IsKit, IsModifier, Inv_Num_Barcode_Labels, Use_Serial_Numbers,
            Num_Bonus_Points, IsRental, Use_Bulk_Pricing, Print_Ticket,
            Print_Voucher, Num_Days_Valid, IsMatrixItem, AutoWeigh, Dirty,
            FoodStampable, Exclude_Acct_Limit, Check_ID, Prompt_Price,
            Prompt_Quantity, Allow_BuyBack, Special_Permission, Prompt_Description,
            Check_ID2, Count_This_Item, Print_On_Receipt, Transfer_Markup_Enabled,
            As_Is, Import_Markup, PricePerMeasure,
            AvailableOnline, DoughnutTax, RowID,
            DisableInventoryUpload, InvoiceLimitQty, ItemCategory, IsRestrictedPerInvoice
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            1, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 1, 1,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 1, 1, 0,
            0, 0, 0,
            0, 0, NEWID(),
            0, 0, 0, 0
        )
    """
    
    cursor.execute(insert_query, (
        item['item_num'],
        item['item_name'],
        LOCAL_STORE_ID,
        item['cost'],
        item['price'],
        item['retail_price'],
        item['in_stock'],
        item['reorder_level'],
        item['reorder_quantity'],
        item['dept_id'] or 'NONE',
        item['vendor_number'],
        item['unit_type'],
        item['unit_size']
    ))
    
    conn.commit()
    print('SUCCESS: Item inserted!')
    
except Exception as e:
    print('ERROR:', str(e))

# Verify insertion
cursor.execute("SELECT ItemNum, ItemName, In_Stock FROM Inventory WHERE ItemNum = 'BIDIR-TEST-001' AND Store_ID = ?", (LOCAL_STORE_ID,))
row = cursor.fetchone()
if row:
    print('Verified: ItemNum:', row[0], 'Name:', row[1], 'Stock:', row[2])
else:
    print('Item NOT found after insert')

cursor.close()
conn.close()
