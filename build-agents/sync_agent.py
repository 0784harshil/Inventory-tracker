
import pyodbc 
import requests
import time
import json
import os
import sys
from datetime import datetime, timezone

# --- CONFIGURATION PATH LOGIC ---
if getattr(sys, 'frozen', False):
    # If running as EXE, use the executable's directory
    BASE_DIR = os.path.dirname(sys.executable)
else:
    # If running as script, use the script's directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(BASE_DIR, 'config.ini')
STATE_FILE = os.path.join(BASE_DIR, 'sync_state.json')

def load_config():
    config = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8', errors='ignore') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#') or line.startswith('['): continue
                    if '=' in line:
                        key, val = line.split('=', 1)
                        # Handle normal keys and mapping [supabase] keys
                        if key.strip() == 'url': config['supa_url'] = val.strip()
                        elif key.strip() == 'key': config['supa_key'] = val.strip()
                        else: config[key.strip()] = val.strip()
        except:
            print("Error reading specific config lines, proceeding...")
    return config

config = load_config()

# General Settings from Config
STORE_ID = config.get('CLOUD_STORE_ID', 'STORE-UNKNOWN')
SQL_SERVER = config.get('SQL_SERVER', 'localhost')
SQL_DATABASE = config.get('SQL_DATABASE', 'cresql')
# Default Windows Auth to True unless explicitly False
WINDOWS_AUTH = config.get('WINDOWS_AUTH', 'true').strip().lower() == 'true'
SYNC_INTERVAL = int(config.get('SYNC_INTERVAL', 30))

# Supabase Credentials (Env > Config > Default)
SUPABASE_URL = os.getenv('SUPABASE_URL') or config.get('supa_url') or ''
SUPABASE_KEY = os.getenv('SUPABASE_KEY') or config.get('supa_key') or ''

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {msg}", flush=True)

if not SUPABASE_KEY:
    log("[ERROR] SUPABASE_KEY is missing via config.ini or env var! Agent will fail.", "ERROR")

class SyncAgent:
    def __init__(self):
        self.sql_conn = None
        self.local_store_id = STORE_ID
        self.synced_down_items = set() # Track items synced down this cycle
        self.dept_map = {} # Cache trimmed -> real DeptID mapping

    def connect_sql(self):
        """Connect to local SQL Server with auto-discovery"""
        drivers = [d for d in pyodbc.drivers() if 'SQL' in d]
        log(f"Installed Drivers: {drivers}")
        
        # Try configured server first, then common alternatives
        servers = [SQL_SERVER]
        if SQL_SERVER not in ['localhost', '127.0.0.1']:
            servers.extend(['localhost', '127.0.0.1'])
        
        for server in servers:
            for driver in drivers:
                try:
                    conn_str = f'DRIVER={{{driver}}};SERVER={server};DATABASE={SQL_DATABASE};'
                    if WINDOWS_AUTH:
                        conn_str += 'Trusted_Connection=yes;TrustServerCertificate=yes;'
                    else:
                        conn_str += f'UID={config.get("SQL_USER")};PWD={config.get("SQL_PASSWORD")};TrustServerCertificate=yes;'
                    
                    log(f"Trying: {server} | {driver} | {'Windows Auth' if WINDOWS_AUTH else 'SQL Auth'}...")
                    self.sql_conn = pyodbc.connect(conn_str)
                    log(f"[INFO] SUCCESS! Connected to: {server}")
                    self.fetch_local_store_id()
                    self.ensure_schema()
                    return True
                except Exception as e:
                    # log(f"Connection failed ({server}): {e}", "DEBUG")
                    continue
        return False

    def fetch_local_store_id(self):
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("SELECT TOP 1 Store_ID FROM Inventory")
            row = cursor.fetchone()
            if row and row.Store_ID:
                self.local_store_id = row.Store_ID
                log(f"[INFO] Detected Local Store ID: {self.local_store_id}")
            else:
                self.local_store_id = STORE_ID
                log(f"[WARN] Could not detect Local Store ID via SQL. Using Config: {self.local_store_id}")
        except:
            self.local_store_id = STORE_ID
            log(f"[WARN] Failed to fetch Local Store ID. Defaulting to: {self.local_store_id}")

    def ensure_schema(self):
        """Ensure ItemType and Local_Updated_At columns exist"""
        try:
            cursor = self.sql_conn.cursor()
            # Check ItemType
            try:
                cursor.execute("SELECT TOP 1 ItemType FROM Inventory")
            except:
                log("[WARN] ItemType column missing. Adding it...")
                cursor.execute("ALTER TABLE Inventory ADD ItemType INT DEFAULT 0")
                self.sql_conn.commit()
                log("[INFO] Added ItemType column.")

            # Check Local_Updated_At
            try:
                cursor.execute("SELECT TOP 1 Local_Updated_At FROM Inventory")
            except:
                log("[WARN] Local_Updated_At column missing. Adding it...")
                cursor.execute("ALTER TABLE Inventory ADD Local_Updated_At DATETIME DEFAULT GETDATE()")
                self.sql_conn.commit()
                log("[INFO] Added Local_Updated_At column.")
                
                # We cannot easily CREATE TRIGGER via pyodbc in some contexts, but we can try
                # Or rely on the setup script. We'll try here just in case.
                try:
                    trigger_sql = """
                        CREATE TRIGGER trg_Inventory_UpdateTimestamp ON Inventory 
                        AFTER UPDATE AS 
                        BEGIN 
                            UPDATE Inventory SET Local_Updated_At = GETDATE() 
                            FROM Inventory i INNER JOIN inserted ins ON i.ItemNum = ins.ItemNum
                        END
                    """
                    cursor.execute(trigger_sql)
                    self.sql_conn.commit()
                    log("[INFO] Created timestamp trigger.")
                except Exception as ex:
                    log(f"[WARN] Could not create trigger automatically (might exist or permission error): {ex}")

        except Exception as e:
            log(f"[ERROR] Schema check failed: {e}", "ERROR")

    def load_last_sync(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, 'r') as f:
                    data = json.load(f)
                    return data.get('last_sync', "2000-01-01T00:00:00")
            except: pass
        return "2000-01-01T00:00:00"

    def save_last_sync(self, timestamp):
        try:
            with open(STATE_FILE, 'w') as f:
                json.dump({'last_sync': timestamp}, f)
        except Exception as e:
            log(f"[WARN] Failed to save sync state: {e}", "WARNING")

    def fetch_local_departments(self):
        """Fetch departments from local SQL"""
        try:
            cursor = self.sql_conn.cursor()
            cursor.execute("SELECT Dept_ID, Description FROM Departments")
            depts = []
            for row in cursor.fetchall():
                raw_id = row.Dept_ID
                stripped_id = str(raw_id).strip()
                self.dept_map[stripped_id] = raw_id # Caching raw ID for lookups
                
                depts.append({
                    'dept_id': stripped_id,
                    'dept_name': row.Description,
                    'store_id': STORE_ID
                })
            return depts
        except Exception as e:
            log(f"[ERROR] Error fetching departments: {e}", "ERROR")
            return []

    def sync_departments(self, departments):
        """Sync departments to Supabase"""
        if not departments: return
        try:
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}
            count = 0
            for dept in departments:
                try:
                    res = requests.post(f'{SUPABASE_URL}/rest/v1/departments?on_conflict=dept_id,store_id', headers=headers, json=dept)
                    if res.status_code in [200, 201, 204, 409]: 
                        count += 1
                except: pass
            log(f"[OK] Synced {count}/{len(departments)} departments")
        except Exception as e:
            log(f"[ERROR] Sync departments failed: {e}", "ERROR")

    def fetch_inventory(self):
        """Fetch inventory from local SQL Server"""
        try:
            cursor = self.sql_conn.cursor()
            # Ensure we select Local_Updated_At
            query = """
                SELECT ItemNum, ItemName, Dept_ID, In_Stock, Cost, Price, ItemType, Local_Updated_At
                FROM Inventory
            """
            cursor.execute(query)
            items = []
            for row in cursor.fetchall():
                try: item_type = int(row.ItemType or 0)
                except: item_type = 0
                
                items.append({
                    'item_num': str(row.ItemNum).strip(),
                    'item_name': row.ItemName,
                    'dept_id': str(row.Dept_ID).strip() if row.Dept_ID else 'OTHER',
                    'itemtype': item_type,
                    'in_stock': float(row.In_Stock or 0),
                    'cost': float(row.Cost or 0),
                    'price': float(row.Price or 0),
                    'store_id': STORE_ID,
                    'last_synced_at': datetime.now(timezone.utc).isoformat(),
                    'retail_price': float(row.Price or 0),
                    '_local_updated_at': row.Local_Updated_At  # Internal use for timestamp comparison
                })
            log(f" Fetched {len(items)} inventory items")
            return items
        except Exception as e:
            log(f"[ERROR] Error fetching inventory: {e}", "ERROR")
            return []

    def sync_inventory(self, items):
        """Sync inventory to Supabase with timestamp comparison"""
        if not items: return
        try:
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates'}
            success = 0
            skipped = 0
            
            # Build lookup of cloud timestamps (Handle Pagination)
            cloud_headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-999'}
            cloud_timestamps = {}
            offset = 0
            limit = 1000
            while True:
                cloud_headers['Range'] = f'{offset}-{offset+limit-1}'
                cloud_res = requests.get(f'{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&select=item_num,updated_at', headers=cloud_headers)
                if cloud_res.status_code == 200:
                    batch = cloud_res.json()
                    if not batch: break
                    for c in batch:
                        cloud_timestamps[c['item_num']] = c.get('updated_at', '')
                    if len(batch) < limit: break
                    offset += limit
                else: break
            
            log(f"Fetched {len(cloud_timestamps)} cloud timestamps for comparison")

            for item in items:
                local_updated = item.pop('_local_updated_at', None)  # Remove internal field before sending
                item_num = item['item_num']
                cloud_updated = cloud_timestamps.get(item_num, '')
                
                # Compare timestamps - only push if local is newer
                if local_updated and cloud_updated:
                    from datetime import datetime, timedelta, timezone as tz
                    try:
                        cloud_dt = datetime.fromisoformat(cloud_updated.replace('Z', '+00:00'))
                        local_dt = local_updated.replace(tzinfo=None)
                        local_dt_utc = local_dt + timedelta(hours=6)  # CST to UTC
                        local_dt_utc = local_dt_utc.replace(tzinfo=tz.utc)
                        
                        if cloud_dt >= local_dt_utc:
                            skipped += 1
                            continue  # Cloud is newer or same, skip push
                    except:
                        pass  # If parsing fails, proceed with push
                
                try:
                    res = requests.post(f'{SUPABASE_URL}/rest/v1/inventory?on_conflict=item_num,store_id', headers=headers, json=item)
                    if res.status_code in [200, 201, 204]: success += 1
                except: pass
                
            if skipped > 0:
                log(f"[SKIP] Skipped {skipped} items (cloud is newer or same)")
            log(f"[OK] Synced {success}/{len(items) - skipped} items")
        except Exception as e:
            log(f"[ERROR] Sync inventory failed: {e}", "ERROR")

    def sync_down_departments(self, last_sync):
        """Fetch updated departments from Cloud -> Local"""
        try:
            import urllib.parse
            safe_sync = urllib.parse.quote(last_sync)
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
            url = f"{SUPABASE_URL}/rest/v1/departments?store_id=eq.{STORE_ID}&updated_at=gt.{safe_sync}"
            res = requests.get(url, headers=headers)
            if res.status_code == 200:
                depts = res.json()
                if not depts: return
                
                cursor = self.sql_conn.cursor()
                count = 0
                for d in depts:
                    try:
                        cursor.execute("SELECT Count(*) FROM Departments WHERE Dept_ID = ?", (d['dept_id'],))
                        exists = cursor.fetchone()[0] > 0
                        if exists:
                            cursor.execute("UPDATE Departments SET Description = ? WHERE Dept_ID = ?", (d['dept_name'], d['dept_id']))
                        else:
                            cursor.execute("INSERT INTO Departments (Dept_ID, Description) VALUES (?, ?)", (d['dept_id'], d['dept_name']))
                        self.sql_conn.commit()
                        count += 1
                    except Exception as e:
                        log(f"Failed to apply dept {d['dept_id']}: {e}", "WARNING")
                if count > 0:
                    log(f"[OK] Applied {count} department updates from Cloud")
        except Exception as e:
            log(f"[ERROR] Sync Down Depts failed: {e}", "ERROR")

    def sync_down_inventory(self, last_sync):
        """Fetch updated inventory from Cloud -> Local"""
        try:
            import urllib.parse
            safe_sync = urllib.parse.quote(last_sync)
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}', 'Range': '0-4999'}
            # Fetch items updated OR created since last sync
            url = f"{SUPABASE_URL}/rest/v1/inventory?store_id=eq.{STORE_ID}&or=(updated_at.gt.{safe_sync},created_at.gt.{safe_sync})"
            res = requests.get(url, headers=headers)
            
            if res.status_code == 200:
                items = res.json()
                if not items: return
                
                log(f"[DOWN] syncing down {len(items)} items from cloud...")
                cursor = self.sql_conn.cursor()
                count = 0
                skipped = 0
                for i in items:
                    try:
                        i_num = str(i['item_num']).strip()
                        cloud_updated = i.get('updated_at', '')
                        
                        # Check existance and timestamp
                        cursor.execute("SELECT Local_Updated_At FROM Inventory WHERE ItemNum = ?", (i_num,))
                        row = cursor.fetchone()
                        
                        if row:
                            local_updated = row.Local_Updated_At
                            # Timestamp Logic
                            if local_updated and cloud_updated:
                                from datetime import datetime
                                try:
                                    cloud_dt = datetime.fromisoformat(cloud_updated.replace('Z', '+00:00'))
                                    local_dt = local_updated.replace(tzinfo=None)
                                    from datetime import timedelta, timezone as tz
                                    local_dt_utc = local_dt + timedelta(hours=6)
                                    local_dt_utc = local_dt_utc.replace(tzinfo=tz.utc)
                                    
                                    if local_dt_utc > cloud_dt:
                                        skipped += 1
                                        continue
                                except: pass
                            
                            cursor.execute("""
                                UPDATE Inventory 
                                SET ItemName=?, Price=?, Cost=?, Dept_ID=?, In_Stock=?, ItemType=?, Local_Updated_At=GETDATE()
                                WHERE ItemNum=?
                            """, (i['item_name'], i['price'], i['cost'], i['dept_id'], i['in_stock'], i.get('itemtype', 0), i_num))
                        else:
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
                                    As_Is, Local_Updated_At
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
                                    0, GETDATE()
                                )
                            """, (i_num, i['item_name'], i['price'], i['cost'], self.dept_map.get(str(i['dept_id']).strip(), str(i['dept_id']).strip()), i['in_stock'], i.get('itemtype', 0), self.local_store_id))
                        self.sql_conn.commit()
                        self.synced_down_items.add(i_num)
                        count += 1
                    except Exception as e:
                        # log(f"[WARN] Item {i['item_num']}: {e}", "DEBUG")
                        pass
                if skipped > 0:
                    log(f"[SKIP] Skipped {skipped} items (local is newer)")
                log(f"[OK] Applied {count} inventory updates")
        except Exception as e:
            log(f"[ERROR] Sync Down Inventory failed: {e}", "ERROR")

    def process_transfers(self):
        """Process incoming transfers"""
        try:
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
            res = requests.get(f'{SUPABASE_URL}/rest/v1/transfers?to_store=eq.{STORE_ID}&status=eq.in-transit', headers=headers)
            if res.status_code == 200:
                transfers = res.json()
                if transfers:
                    log(f"[IN] Found {len(transfers)} incoming transfers")
                    cursor = self.sql_conn.cursor()
                    for t in transfers:
                        try:
                            # Update Local Stock
                            cursor.execute("UPDATE Inventory SET In_Stock = In_Stock + ? WHERE ItemNum = ?", (t['quantity'], t['item_num']))
                            if cursor.rowcount == 0:
                                log(f"[WARN] Transfer item {t['item_num']} not found locally, skipping stock add.")
                            else:
                                self.sql_conn.commit()

                            # Mark Complete
                            requests.patch(f'{SUPABASE_URL}/rest/v1/transfers?id=eq.{t["id"]}', 
                                         headers=headers, 
                                         json={'status': 'completed', 'received_at': datetime.now(timezone.utc).isoformat()})
                            
                            log(f"[OK] Processed transfer {t['id']} ({t['item_name']})")
                        except Exception as ex:
                            log(f"[ERROR] Failed transfer {t['id']}: {ex}")
        except Exception as e:
            log(f"[ERROR] Error processing transfers: {e}", "ERROR")

    def run(self):
        log(f" Starting {STORE_ID} Agent - TWO-WAY SYNC ENABLED")
        log(f" Loading config from: {CONFIG_FILE}")
        
        if not self.connect_sql():
            log("[STOP] EXITING: Database connection failed. Check config.ini", "ERROR")
            input("Press Enter to exit...")
            return

        log("[INFO] Database Connected! Starting sync loop...")
        
        last_sync_time = self.load_last_sync()
        log(f"[INFO] Last Sync Checkpoint: {last_sync_time}")
        
        cycle = 0
        try:
            while True:
                cycle += 1
                log(f"[INFO] --- Cycle #{cycle} ---")
                current_sync_start = datetime.now(timezone.utc).isoformat()
                
                self.synced_down_items.clear()
                self.fetch_local_departments()
                self.sync_down_departments(last_sync_time)
                self.sync_down_inventory(last_sync_time)
                
                self.save_last_sync(current_sync_start)
                last_sync_time = current_sync_start

                self.sync_departments(self.fetch_local_departments())
                self.sync_inventory(self.fetch_inventory())
                self.process_transfers()
                
                log(f" Waiting {SYNC_INTERVAL}s...")
                time.sleep(SYNC_INTERVAL)
        except KeyboardInterrupt:
            log("⏹️ Agent stopped by user")
        except Exception as e:
            log(f"[ERROR] Agent crashed: {e}", "ERROR")
        finally:
            if self.sql_conn: self.sql_conn.close()

if __name__ == "__main__":
    SyncAgent().run()
