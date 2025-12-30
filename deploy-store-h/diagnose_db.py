import pyodbc
import configparser
import os
import sys

def get_config():
    if os.path.exists('config.ini'):
        config = configparser.ConfigParser()
        config.read('config.ini')
        return config
    return None

def main():
    print("="*50)
    print("      DIAGNOSTIC TOOL - DATABASE UPDATE TEST      ")
    print("="*50)
    
    config = get_config()
    if not config:
        print("ERROR: config.ini not found!")
        print("Please place this script in the deploy-store-h or deploy-store-k folder.")
        input("Press Enter to exit...")
        return

    conn_str = config.get('database', 'connection_string')
    store_id = config.get('database', 'local_store_id', fallback='1001')
    
    print(f"Connecting to DB with Store ID: {store_id}")
    
    try:
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        print("✅ Connection Successful!")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        input("Press Enter to exit...")
        return

    while True:
        print("\n" + "-"*30)
        item_num = input("Enter Item Number to test (or 'q' to quit): ").strip()
        if item_num.lower() == 'q':
            break

        # 1. READ
        print(f"\nSearching for '{item_num}' in Store '{store_id}'...")
        cursor.execute("SELECT ItemNum, ItemName, In_Stock, Store_ID FROM Inventory WHERE ItemNum = ? AND Store_ID = ?", (item_num, store_id))
        row = cursor.fetchone()

        if not row:
            print(f"❌ Item '{item_num}' NOT FOUND in Store '{store_id}'!")
            
            # Try searching without Store ID to see if it exists elsewhere
            cursor.execute("SELECT ItemNum, ItemName, In_Stock, Store_ID FROM Inventory WHERE ItemNum = ?", (item_num,))
            rows = cursor.fetchall()
            if rows:
                print("   However, I found it with these Store IDs:")
                for r in rows:
                    print(f"   - Store: {r[3]}, Stock: {r[2]}, Name: {r[1]}")
            else:
                print("   It does not exist at all in the Inventory table.")
            continue

        print(f"✅ Found Item: {row[1]}")
        print(f"   Current Stock: {row[2]}")
        
        # 2. UPDATE
        try:
            amount = float(input("\nEnter amount to SUBTRACT (e.g. 1): "))
            new_val = float(row[2]) - amount
            
            print(f"Attempting to update stock to {new_val}...")
            
            # Use explicit update
            cursor.execute("UPDATE Inventory SET In_Stock = ? WHERE ItemNum = ? AND Store_ID = ?", (new_val, item_num, store_id))
            conn.commit()
            
            print("Update executed. Verifying...")
            
            # 3. VERIFY
            cursor.execute("SELECT In_Stock FROM Inventory WHERE ItemNum = ? AND Store_ID = ?", (item_num, store_id))
            v_row = cursor.fetchone()
            if v_row:
                print(f"✅ New DB Value: {v_row[0]}")
                if abs(float(v_row[0]) - new_val) < 0.01:
                    print("🎉 SUCCESS! Database accepted the change.")
                else:
                    print("❌ FAILURE! Database reverted the change or trigger prevented it.")
            else:
                print("❌ ERROR: Could not read back item!")
                
        except ValueError:
            print("Invalid number entered.")
        except Exception as e:
            print(f"❌ Update Error: {e}")

    conn.close()

if __name__ == "__main__":
    main()
