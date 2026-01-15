"""
Multi-Store Inventory Sync Agent (with Transfer Processing)
============================================================
Syncs inventory to cloud AND processes transfers from cloud to update local SQL.
"""

import pyodbc
import time
import logging
import os
import sys
import json
import httpx
from datetime import datetime, timezone
from configparser import ConfigParser

# Configure logging - log to file next to exe
if getattr(sys, 'frozen', False):
    log_path = os.path.join(os.path.dirname(sys.executable), 'sync_agent.log')
else:
    log_path = 'sync_agent.log'

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_path),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class SupabaseClient:
    """Lightweight Supabase client using httpx"""
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.headers = {
            'apikey': key,
            'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
        }
    
    def upsert(self, table: str, data, on_conflict: str = None):
        """Insert or update a record or batch of records"""
        url = f"{self.url}/rest/v1/{table}"
        if on_conflict:
            url = f"{url}?on_conflict={on_conflict}"
        
        headers = self.headers.copy()
        # Use correct Prefer header for upsert - must include resolution=merge-duplicates
        headers['Prefer'] = 'resolution=merge-duplicates,return=minimal'
        
        # Handle both single dict and list of dicts
        payload = data if isinstance(data, list) else [data]
        
        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                return len(payload) if isinstance(data, list) else True
        except httpx.HTTPStatusError as e:
            # Log more details for debugging
            logger.error(f"Upsert error: {e} - Response: {e.response.text if hasattr(e.response, 'text') else 'N/A'}")
            return 0 if isinstance(data, list) else False
        except Exception as e:
            logger.error(f"Upsert error: {e}")
            return 0 if isinstance(data, list) else False
    
    def select(self, table: str, filters: dict = None, select_fields: str = '*'):
        """Select records from a table"""
        url = f"{self.url}/rest/v1/{table}"
        params = {'select': select_fields}
        if filters:
            for key, value in filters.items():
                params[key] = f"eq.{value}"
        
        headers = self.headers.copy()
        headers['Prefer'] = 'return=representation'
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(url, params=params, headers=headers)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Select error: {e}")
            return []
    
    def select_transfer_items(self, transfer_id: str):
        """Get items for a specific transfer"""
        url = f"{self.url}/rest/v1/transfer_items"
        params = {'transfer_id': f"eq.{transfer_id}"}
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.get(url, params=params, headers=self.headers)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Select transfer items error: {e}")
            return []
    
    def update(self, table: str, data: dict, filters: dict):
        """Update records in a table"""
        url = f"{self.url}/rest/v1/{table}"
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        
        try:
            with httpx.Client(timeout=30) as client:
                response = client.patch(url, json=data, params=params, headers=self.headers)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Update error: {e}")
            return False
    
    def insert(self, table: str, data: dict):
        """Insert a record"""
        url = f"{self.url}/rest/v1/{table}"
        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(url, json=data, headers=self.headers)
                response.raise_for_status()
                return True
        except Exception as e:
            logger.error(f"Insert error: {e}")
            return False


class SyncAgent:
    def __init__(self, config_path=None):
        # Find config.ini relative to exe or script location
        if config_path is None:
            if getattr(sys, 'frozen', False):
                base_dir = os.path.dirname(sys.executable)
            else:
                base_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(base_dir, 'config.ini')
        
        if not os.path.exists(config_path):
            logger.error(f"Config file not found: {config_path}")
            logger.error("Please create config.ini with your settings")
            input("Press Enter to exit...")
            sys.exit(1)
        
        self.config = ConfigParser()
        self.config.read(config_path)
        
        # SQL Server connection
        self.sql_conn_str = self.config.get('database', 'connection_string')
        self.cloud_store_id = self.config.get('database', 'cloud_store_id')
        self.local_store_id = self.config.get('database', 'local_store_id', fallback='1001')
        
        # Supabase connection (lightweight client)
        supabase_url = self.config.get('supabase', 'url')
        supabase_key = self.config.get('supabase', 'key')
        self.supabase = SupabaseClient(supabase_url, supabase_key)
        
        # Sync settings
        self.sync_interval = self.config.getint('sync', 'interval_seconds', fallback=30)
        
        # Tracking file for cloud-to-local sync
        if getattr(sys, 'frozen', False):
            self.sync_state_file = os.path.join(os.path.dirname(sys.executable), 'sync_state.json')
        else:
            self.sync_state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sync_state.json')
        
        logger.info(f"Sync Agent initialized for Cloud Store ID: {self.cloud_store_id}")
    
    def get_sql_connection(self):
        """Get SQL Server connection"""
        return pyodbc.connect(self.sql_conn_str)
    
    def fetch_inventory_from_sql(self):
        """Fetch all inventory from SQL Server"""
        query = """
        SELECT 
            ItemNum,
            ItemName,
            Cost,
            Price,
            Retail_Price,
            In_Stock,
            Reorder_Level,
            Reorder_Quantity,
            Dept_ID,
            Vendor_Number,
            Unit_Type,
            Unit_Size,
            Last_Sold
        FROM Inventory
        WHERE Store_ID = ?
        """
        
        try:
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            cursor.execute(query, (self.local_store_id,))
            
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            
            inventory = []
            for row in rows:
                item = dict(zip(columns, row))
                inventory.append({
                    'item_num': str(item['ItemNum']).strip() if item['ItemNum'] else '',
                    'item_name': str(item['ItemName']).strip() if item['ItemName'] else '',
                    'store_id': self.cloud_store_id,
                    'cost': float(item['Cost'] or 0),
                    'price': float(item['Price'] or 0),
                    'retail_price': float(item['Retail_Price'] or 0),
                    'in_stock': float(item['In_Stock'] or 0),
                    'reorder_level': float(item['Reorder_Level'] or 0),
                    'reorder_quantity': float(item['Reorder_Quantity'] or 0),
                    'dept_id': str(item['Dept_ID']).strip() if item['Dept_ID'] else None,
                    'vendor_number': str(item['Vendor_Number']).strip() if item['Vendor_Number'] else None,
                    'unit_type': str(item['Unit_Type']).strip() if item['Unit_Type'] else None,
                    'unit_size': float(item['Unit_Size']) if item['Unit_Size'] else None,
                    'last_sold': item['Last_Sold'].isoformat() if item['Last_Sold'] else None,
                    'last_synced_at': datetime.now().isoformat()
                })
            
            cursor.close()
            conn.close()
            
            return inventory
            
        except Exception as e:
            logger.error(f"Error fetching inventory from SQL Server: {e}")
            return []
    
    def fetch_departments_from_sql(self):
        """Fetch all departments from local SQL Server"""
        query = """
        SELECT 
            Dept_ID,
            Store_ID,
            Description
        FROM Departments
        WHERE Store_ID = ?
        """
        
        try:
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            cursor.execute(query, (self.local_store_id,))
            
            columns = [column[0] for column in cursor.description]
            rows = cursor.fetchall()
            
            departments = []
            for row in rows:
                item = dict(zip(columns, row))
                departments.append({
                    'dept_id': str(item['Dept_ID']).strip() if item['Dept_ID'] else '',
                    'store_id': self.cloud_store_id,
                    'description': str(item['Description']).strip() if item['Description'] else '',
                    'last_synced_at': datetime.now().isoformat()
                })
            
            cursor.close()
            conn.close()
            
            return departments
            
        except Exception as e:
            logger.error(f"Error fetching departments from SQL Server: {e}")
            return []
    
    def sync_departments_to_cloud(self, departments):
        """Sync departments to Supabase"""
        if not departments:
            logger.info("No departments to sync")
            return 0
        
        try:
            self.supabase.upsert('departments', departments, on_conflict='dept_id,store_id')
            logger.info(f"Synced {len(departments)} departments to cloud")
            return len(departments)
        except Exception as e:
            logger.error(f"Error syncing departments to cloud: {e}")
            return 0
    
    def sync_inventory_to_cloud(self, inventory):
        """Sync inventory data to Supabase in batches (Safe Mode)"""
        if not inventory:
            logger.info("No inventory to sync")
            return 0
        
        synced_count = 0
        batch_size = 50  # Reduced batch size
        total_batches = (len(inventory) + batch_size - 1) // batch_size
        
        for i in range(0, len(inventory), batch_size):
            batch = inventory[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            try:
                # Try batch upsert
                self.supabase.upsert('inventory', batch, on_conflict='item_num,store_id')
                synced_count += len(batch)
                logger.info(f"Batch {batch_num}/{total_batches}: synced {len(batch)} items")
                
            except Exception as batch_error:
                logger.error(f"Batch {batch_num} failed: {batch_error}. Retrying one-by-one...")
                # Fallback: One-by-one
                for item in batch:
                    try:
                        self.supabase.upsert('inventory', [item], on_conflict='item_num,store_id')
                        synced_count += 1
                    except Exception as single_error:
                        logger.error(f"Failed to sync item {item.get('item_num')}: {single_error}")
        
        logger.info(f"Synced {synced_count}/{len(inventory)} inventory items to cloud")
        return synced_count
    
    def get_last_cloud_sync_timestamp(self):
        """Get the last successful cloud-to-local sync timestamp from tracking file"""
        try:
            if os.path.exists(self.sync_state_file):
                with open(self.sync_state_file, 'r') as f:
                    state = json.load(f)
                    return state.get('last_cloud_sync')
        except Exception as e:
            logger.warning(f"Could not read sync state file: {e}")
        return None
    
    def save_last_cloud_sync_timestamp(self, timestamp):
        """Save the last successful cloud-to-local sync timestamp"""
        try:
            with open(self.sync_state_file, 'w') as f:
                json.dump({'last_cloud_sync': timestamp}, f)
        except Exception as e:
            logger.error(f"Could not save sync state: {e}")
    
    def insert_item_to_local(self, item):
        """Insert a new item into local SQL Server database"""
        try:
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            
            # Validate dept_id - check if it exists in Departments table
            dept_id = item.get('dept_id')
            if dept_id:
                cursor.execute("SELECT COUNT(*) FROM Departments WHERE Dept_ID = ?", (dept_id,))
                if cursor.fetchone()[0] == 0:
                    # Department doesn't exist - get a default valid department
                    cursor.execute("SELECT TOP 1 Dept_ID FROM Departments")
                    row = cursor.fetchone()
                    dept_id = row[0] if row else None
                    logger.warning(f"Dept '{item.get('dept_id')}' not found, using '{dept_id}'")
            
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
                item.get('item_name', 'Web Created Item'),
                self.local_store_id,
                item.get('cost', 0),
                item.get('price', 0),
                item.get('retail_price') or item.get('price', 0),
                item.get('in_stock', 0),
                item.get('reorder_level', 0),
                item.get('reorder_quantity', 0),
                dept_id,  # Use validated dept_id
                item.get('vendor_number'),
                item.get('unit_type'),
                item.get('unit_size')
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info(f"Inserted new item {item['item_num']} from cloud to local DB")
            return True
            
        except Exception as e:
            logger.error(f"Error inserting item {item.get('item_num')} to local: {e}")
            return False
    
    def update_item_in_local(self, item):
        """Update an existing item in local SQL Server database"""
        try:
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            
            update_query = """
                UPDATE Inventory SET
                    ItemName = ?,
                    Cost = ?,
                    Price = ?,
                    Retail_Price = ?,
                    In_Stock = ?,
                    Reorder_Level = ?,
                    Reorder_Quantity = ?,
                    Dept_ID = ?,
                    Vendor_Number = ?,
                    Unit_Type = ?,
                    Unit_Size = ?
                WHERE ItemNum = ? AND Store_ID = ?
            """
            
            cursor.execute(update_query, (
                item.get('item_name', 'Unknown'),
                item.get('cost', 0),
                item.get('price', 0),
                item.get('retail_price') or item.get('price', 0),
                item.get('in_stock', 0),
                item.get('reorder_level', 0),
                item.get('reorder_quantity', 0),
                item.get('dept_id') or 'NONE',
                item.get('vendor_number'),
                item.get('unit_type'),
                item.get('unit_size'),
                item['item_num'],
                self.local_store_id
            ))
            
            affected = cursor.rowcount
            conn.commit()
            cursor.close()
            conn.close()
            
            if affected > 0:
                logger.info(f"Updated item {item['item_num']} from cloud to local DB")
                return True
            else:
                logger.warning(f"No local record found to update for item {item['item_num']}")
                return False
                
        except Exception as e:
            logger.error(f"Error updating item in local: {e}")
            return False
    
    def sync_items_from_cloud(self):
        """Sync new/updated items FROM cloud TO local SQL Server (Two-Way Sync)"""
        logger.info("Checking for new/updated items from cloud...")
        
        try:
            # Get items from cloud for this store
            cloud_items = self.supabase.select('inventory', {
                'store_id': self.cloud_store_id
            })
            
            if not cloud_items:
                logger.info("No items found in cloud for this store")
                return 0
            
            synced_count = 0
            new_items = 0
            updated_items = 0
            
            # Get list of existing local item numbers
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT ItemNum FROM Inventory WHERE Store_ID = ?",
                (self.local_store_id,)
            )
            local_items = {row[0].strip() for row in cursor.fetchall()}
            cursor.close()
            conn.close()
            
            # Process each cloud item
            for item in cloud_items:
                item_num = str(item['item_num']).strip()
                
                if item_num not in local_items:
                    # New item - insert to local
                    if self.insert_item_to_local(item):
                        synced_count += 1
                        new_items += 1
                else:
                    # Existing item - update local
                    if self.update_item_in_local(item):
                        synced_count += 1
                        updated_items += 1
            
            logger.info(f"Cloud-to-local sync complete: {new_items} new, {updated_items} updated")
            
            # Update last sync timestamp
            self.save_last_cloud_sync_timestamp(datetime.now(timezone.utc).isoformat())
            
            return synced_count
            
        except Exception as e:
            logger.error(f"Error syncing items from cloud: {e}")
            return 0
    
    def update_local_stock(self, item_num: str, quantity_change: float, operation: str = 'add', item_name: str = None):
        """Update stock in local SQL Server and return old/new stock values via Store_ID."""
        try:
            conn = self.get_sql_connection()
            cursor = conn.cursor()
            
            # Prepare WHERE clause
            where_clause = "WHERE ItemNum = ?"
            params = [item_num]
            if hasattr(self, 'local_store_id') and self.local_store_id:
                where_clause += " AND Store_ID = ?"
                params.append(self.local_store_id)
            
            # 1. Get current stock
            cursor.execute(f"SELECT In_Stock, ItemName FROM Inventory {where_clause}", params)
            row = cursor.fetchone()
            
            if row:
                # Item exists - update it
                old_stock = float(row[0]) if row[0] else 0
                existing_name = row[1] if row[1] else item_name
                
                if operation == 'add':
                    new_stock = old_stock + quantity_change
                    # USE ABSOLUTE UPDATE
                    update_query = f"UPDATE Inventory SET In_Stock = ? {where_clause}"
                    update_params = [new_stock, item_num]
                    
                elif operation == 'subtract':
                    new_stock = old_stock - quantity_change
                    # USE ABSOLUTE UPDATE
                    update_query = f"UPDATE Inventory SET In_Stock = ? {where_clause}"
                    update_params = [new_stock, item_num]
                    
                else:
                    logger.error(f"Unknown operation: {operation}")
                    return {'success': False, 'old_stock': old_stock, 'new_stock': old_stock, 'item_name': existing_name}

                if hasattr(self, 'local_store_id') and self.local_store_id:
                    update_params.append(self.local_store_id)
                    
                cursor.execute(update_query, update_params)
                affected = cursor.rowcount
                logger.info(f"Update SQL affected {affected} rows for {item_num} (Stock: {old_stock}->{new_stock})")
                
                if affected == 0:
                    logger.warning(f"CRITICAL: Found item {item_num} but UPDATE affected 0 rows?!")
                
            elif operation == 'add':
                # Item doesn't exist - INSERT
                old_stock = 0
                new_stock = quantity_change
                existing_name = item_name or 'Unknown Item'
                store_id_to_use = self.local_store_id if hasattr(self, 'local_store_id') and self.local_store_id else '1001'
                
                # Insert item record
                insert_query = """
                    INSERT INTO Inventory (
                        ItemNum, ItemName, Store_ID, Cost, Price, Retail_Price, In_Stock,
                        Reorder_Level, Reorder_Quantity,
                        Tax_1, Tax_2, Tax_3,
                        Dept_ID,
                        IsKit, IsModifier, Inv_Num_Barcode_Labels, Use_Serial_Numbers,
                        Num_Bonus_Points, IsRental, Use_Bulk_Pricing, Print_Ticket,
                        Print_Voucher, Num_Days_Valid, IsMatrixItem, AutoWeigh, Dirty,
                        FoodStampable, Exclude_Acct_Limit, Check_ID, Prompt_Price,
                        Prompt_Quantity, Allow_BuyBack, Special_Permission, Prompt_Description,
                        Check_ID2, Count_This_Item, Print_On_Receipt, Transfer_Markup_Enabled,
                        As_Is,
                        Import_Markup, PricePerMeasure,
                        AvailableOnline, DoughnutTax,
                        RowID,
                        DisableInventoryUpload, InvoiceLimitQty, ItemCategory, IsRestrictedPerInvoice
                    )
                    VALUES (
                        ?, ?, ?, 0, 0, 0, ?,
                        0, 0,
                        1, 0, 0,
                        'NONE',
                        0, 0, 0, 0,
                        0, 0, 0, 0,
                        0, 0, 0, 1, 1,
                        0, 0, 0, 0,
                        0, 0, 0, 0,
                        0, 1, 1, 0,
                        0,
                        0, 0,
                        0, 0,
                        NEWID(),
                        0, 0, 0, 0
                    )
                """
                cursor.execute(insert_query, (item_num, existing_name, store_id_to_use, quantity_change))
                affected = cursor.rowcount
                logger.info(f"Inserted new item {item_num} with StoreID {store_id_to_use}, Stock {new_stock}")
                
            else:
                # Item doesn't exist and subtracting
                logger.warning(f"Cannot subtract from non-existent item {item_num}")
                cursor.close()
                conn.close()
                return {'success': False, 'old_stock': 0, 'new_stock': 0, 'item_name': None}
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return {
                'success': affected > 0,
                'old_stock': old_stock,
                'new_stock': new_stock,
                'item_name': existing_name
            }
            
        except Exception as e:
            logger.error(f"Error updating local stock: {e}")
            return {'success': False, 'old_stock': 0, 'new_stock': 0, 'item_name': None}
            

    
    def log_inventory_change(self, item_num: str, item_name: str, change_type: str, 
                              quantity_change: float, old_stock: float, new_stock: float,
                              transfer_id: str = None, notes: str = None):
        """Log inventory change to Supabase for reporting"""
        try:
            self.supabase.insert('inventory_changes', {
                'item_num': item_num,
                'item_name': item_name,
                'store_id': self.cloud_store_id,
                'change_type': change_type,
                'quantity_change': quantity_change,
                'old_stock': old_stock,
                'new_stock': new_stock,
                'transfer_id': transfer_id,
                'notes': notes
            })
            logger.info(f"Logged inventory change: {item_num} {change_type} {quantity_change}")
        except Exception as e:
            logger.error(f"Error logging inventory change: {e}")
    
    def process_outgoing_transfers(self):
        """Process approved/completed/received transfers FROM this store
           Handles race conditions where destination processes first or user manually completes.
        """
        logger.info("Checking for outgoing transfers...")
        
        # 1. Approved transfers (Normal flow)
        transfers_approved = self.supabase.select('transfers', {
            'from_store_id': self.cloud_store_id,
            'status': 'approved'
        }) or []
        
        # 2. Completed transfers (Check for skipped/fast-forwarded ones)
        transfers_completed = self.supabase.select('transfers', {
            'from_store_id': self.cloud_store_id,
            'status': 'completed'
        }) or []

        # 3. Received transfers (Check if destination processed it first - Race Condition Fix)
        # This occurs if Store K receives it before Store H sync agent runs
        transfers_received = self.supabase.select('transfers', {
            'from_store_id': self.cloud_store_id,
            'status': 'received'
        }) or []
        
        # Combine and deduplicate based on ID if needed, though status is unique per row
        all_candidates = transfers_approved + transfers_completed + transfers_received
        
        # Filter: Only process if 'shipped_at' is NULL (meaning Source hasn't touched it yet)
        transfers_to_process = [t for t in all_candidates if not t.get('shipped_at')]
        
        if not transfers_to_process:
            return 0
        
        processed = 0
        for transfer in transfers_to_process:
            transfer_id = transfer['id']
            status = transfer.get('status')
            to_store = transfer.get('to_store_id', 'Unknown')
            logger.info(f"Processing outgoing transfer {transfer_id} (Status: {status})")
            
            # Get transfer items
            items = self.supabase.select_transfer_items(transfer_id)
            
            all_success = True
            for item in items:
                quantity = float(item['quantity'])
                # Strip whitespace to match SQL Server's trimmed/varchar keys
                raw_item_num = item['item_num']
                item_num = str(raw_item_num).strip()
                
                logger.info(f"Processing Item: '{item_num}' (Raw: '{raw_item_num}', Len: {len(item_num)})")
                
                # Decrement stock in local SQL Server
                result = self.update_local_stock(
                    item_num, 
                    quantity, 
                    'subtract'
                )
                if result['success']:
                    # Log the change for reporting
                    self.log_inventory_change(
                        item_num=item['item_num'],
                        item_name=result.get('item_name') or item.get('item_name'),
                        change_type='transfer_out',
                        quantity_change=-quantity,
                        old_stock=result['old_stock'],
                        new_stock=result['new_stock'],
                        transfer_id=transfer_id,
                        notes=f"Transfer to {to_store}"
                    )
                else:
                    all_success = False
            
            if all_success:
                # Update transfer status
                update_data = {
                    'shipped_at': datetime.now(timezone.utc).isoformat()
                }
                
                # Only update status to 'in_transit' if it was 'approved'
                # If it's 'completed' or 'received', leave status alone, just set shipped_at
                if status == 'approved':
                    # AUTO-COMPLETE MODE: Skip 'in_transit' and go straight to 'completed'
                    # This allows the Destination Agent to pick it up immediately without manual "Receive" click
                    update_data['status'] = 'completed'
                    
                self.supabase.update('transfers', update_data, {'id': transfer_id})
                
                logger.info(f"Transfer {transfer_id} marked as processed (shipped_at set), stock decremented")
                processed += 1
            else:
                logger.warning(f"Transfer {transfer_id} had some failures updating local stock")
        
        return processed
    
    def process_incoming_transfers(self):
        """Process completed transfers TO this store (increment stock)"""
        logger.info("Checking for completed incoming transfers...")
        
        # Get completed transfers where this store is the destination
        transfers = self.supabase.select('transfers', {
            'to_store_id': self.cloud_store_id,
            'status': 'completed'
        })
        
        if not transfers:
            logger.info("No completed incoming transfers to process")
            return 0
        
        processed = 0
        for transfer in transfers:
            transfer_id = transfer['id']
            from_store = transfer.get('from_store_id', 'Unknown')
            logger.info(f"Processing incoming transfer {transfer_id}")
            
            # Get transfer items
            items = self.supabase.select_transfer_items(transfer_id)
            
            all_success = True
            for item in items:
                quantity = float(item['quantity'])
                # Increment stock in local SQL Server (pass item_name for new items)
                result = self.update_local_stock(
                    item['item_num'], 
                    quantity, 
                    'add',
                    item_name=item.get('item_name')
                )
                if result['success']:
                    # Log the change for reporting
                    self.log_inventory_change(
                        item_num=item['item_num'],
                        item_name=result.get('item_name') or item.get('item_name'),
                        change_type='transfer_in',
                        quantity_change=quantity,
                        old_stock=result['old_stock'],
                        new_stock=result['new_stock'],
                        transfer_id=transfer_id,
                        notes=f"Transfer from {from_store}"
                    )
                else:
                    all_success = False
            
            if all_success:
                # Update transfer status to received (so we don't process again)
                self.supabase.update('transfers', {
                    'status': 'received'
                }, {'id': transfer_id})
                
                logger.info(f"Transfer {transfer_id} received, stock incremented")
                processed += 1
            else:
                logger.warning(f"Transfer {transfer_id} had some failures updating local stock")
        
        return processed
    
    def update_store_heartbeat(self):
        """Update the stores table with the current timestamp"""
        try:
            self.supabase.update('stores', {
                'last_sync': datetime.now(timezone.utc).isoformat()
            }, {'store_code': self.cloud_store_id})
        except Exception as e:
            logger.error(f"Error updating store heartbeat: {e}")

    def log_sync(self, sync_type, status, records_synced, error_message=None):
        """Log sync operation to Supabase"""
        try:
            self.supabase.insert('sync_log', {
                'store_id': self.cloud_store_id,
                'sync_type': sync_type,
                'status': status,
                'records_synced': records_synced,
                'error_message': error_message,
                'started_at': datetime.now(timezone.utc).isoformat(),
                'completed_at': datetime.now(timezone.utc).isoformat() if status == 'completed' else None
            })
        except Exception as e:
            logger.error(f"Error logging sync: {e}")
    
    def run(self):
        """Main sync loop"""
        logger.info(f"Starting sync agent for store {self.cloud_store_id}")
        logger.info(f"Sync interval: {self.sync_interval} seconds")
        
        while True:
            try:
                logger.info("=" * 50)
                logger.info("Starting sync cycle...")
                
                # 1. Process outgoing transfers (approved -> in_transit)
                # Do this FIRST so local DB is updated before we read inventory
                outgoing = self.process_outgoing_transfers()
                
                # 2. Process incoming transfers (completed -> received)
                incoming = self.process_incoming_transfers()

                # 3. Sync items FROM cloud TO local (Two-Way Sync)
                # This ensures web-created items appear in local databases
                cloud_synced = self.sync_items_from_cloud()

                # 4. Fetch inventory from SQL Server (now includes cloud-synced items)
                inventory = self.fetch_inventory_from_sql()
                logger.info(f"Fetched {len(inventory)} items from SQL Server")
                
                # 5. Sync to cloud (local -> cloud)
                synced_count = self.sync_inventory_to_cloud(inventory)
                
                # 6. Sync departments to cloud (for dropdown in web form)
                departments = self.fetch_departments_from_sql()
                if departments:
                    self.sync_departments_to_cloud(departments)
                
                # 7. Update Store Heartbeat (Last Sync Time)
                self.update_store_heartbeat()
                
                # 8. Log sync
                self.log_sync('full', 'completed', synced_count)
                
                logger.info(f"Sync cycle complete:")
                logger.info(f"  - Outgoing transfers processed: {outgoing}")
                logger.info(f"  - Incoming transfers processed: {incoming}")
                logger.info(f"  - Cloud->Local items synced: {cloud_synced}")
                logger.info(f"  - Local->Cloud inventory synced: {synced_count}")
                logger.info(f"  - Departments synced: {len(departments)}")
                logger.info(f"Next sync in {self.sync_interval} seconds.")
                logger.info("=" * 50)
                
            except Exception as e:
                logger.error(f"Sync cycle error: {e}")
                self.log_sync('full', 'failed', 0, str(e))
            
            time.sleep(self.sync_interval)


def main():
    try:
        agent = SyncAgent()
        agent.run()
    except KeyboardInterrupt:
        logger.info("Sync agent stopped by user")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        input("Press Enter to exit...")
        sys.exit(1)


if __name__ == '__main__':
    main()
