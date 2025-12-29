-- Supabase Database Schema for Multi-Store Inventory Tracker
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table
CREATE TABLE IF NOT EXISTS stores (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id VARCHAR(10) UNIQUE NOT NULL,
    store_name VARCHAR(100) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    manager_email VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory table (synced from SQL Server)
CREATE TABLE IF NOT EXISTS inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_num VARCHAR(20) NOT NULL,
    item_name VARCHAR(30) NOT NULL,
    store_id VARCHAR(10) NOT NULL REFERENCES stores(store_id),
    cost DECIMAL(25, 8) DEFAULT 0,
    price DECIMAL(25, 8) DEFAULT 0,
    retail_price DECIMAL(25, 8) DEFAULT 0,
    in_stock DECIMAL(25, 8) DEFAULT 0,
    reorder_level FLOAT DEFAULT 0,
    reorder_quantity FLOAT DEFAULT 0,
    dept_id VARCHAR(8),
    vendor_number VARCHAR(12),
    unit_type VARCHAR(10),
    unit_size FLOAT,
    last_sold TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_num, store_id)
);

-- Transfers table
CREATE TABLE IF NOT EXISTS transfers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_number VARCHAR(20) UNIQUE NOT NULL,
    from_store_id VARCHAR(10) NOT NULL REFERENCES stores(store_id),
    to_store_id VARCHAR(10) NOT NULL REFERENCES stores(store_id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_transit', 'completed', 'received', 'cancelled')),
    notes TEXT,
    created_by VARCHAR(100),
    approved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transfer items table
CREATE TABLE IF NOT EXISTS transfer_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    item_num VARCHAR(20) NOT NULL,
    item_name VARCHAR(30),
    quantity DECIMAL(25, 8) NOT NULL,
    unit_cost DECIMAL(25, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync log table (tracks sync operations)
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id VARCHAR(10) NOT NULL REFERENCES stores(store_id),
    sync_type VARCHAR(20) NOT NULL, -- 'full', 'incremental', 'transfer'
    status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
    records_synced INT DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_store_id ON inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item_num ON inventory(item_num);
CREATE INDEX IF NOT EXISTS idx_inventory_in_stock ON inventory(in_stock);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_from_store ON transfers(from_store_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_store ON transfers(to_store_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON transfer_items(transfer_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at
    BEFORE UPDATE ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transfers_updated_at ON transfers;
CREATE TRIGGER update_transfers_updated_at
    BEFORE UPDATE ON transfers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample stores (you can modify these)
INSERT INTO stores (store_id, store_name, address, phone, manager_email)
VALUES 
    ('001', 'Downtown Store', '123 Main Street, Downtown', '(555) 123-4567', 'john@store.com'),
    ('002', 'Mall Location', '456 Shopping Center Blvd', '(555) 987-6543', 'jane@store.com')
ON CONFLICT (store_id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Allow public access for now (you can restrict later with auth)
CREATE POLICY "Allow all access to stores" ON stores FOR ALL USING (true);
CREATE POLICY "Allow all access to inventory" ON inventory FOR ALL USING (true);
CREATE POLICY "Allow all access to transfers" ON transfers FOR ALL USING (true);
CREATE POLICY "Allow all access to transfer_items" ON transfer_items FOR ALL USING (true);
CREATE POLICY "Allow all access to sync_log" ON sync_log FOR ALL USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE transfers;
