-- Inventory Changes tracking table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS inventory_changes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    item_num VARCHAR(20) NOT NULL,
    item_name VARCHAR(30),
    store_id VARCHAR(10) NOT NULL REFERENCES stores(store_id),
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('transfer_out', 'transfer_in', 'adjustment', 'sale', 'receipt')),
    quantity_change DECIMAL(25, 8) NOT NULL,
    old_stock DECIMAL(25, 8),
    new_stock DECIMAL(25, 8),
    transfer_id UUID REFERENCES transfers(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_inventory_changes_store ON inventory_changes(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_item ON inventory_changes(item_num);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_date ON inventory_changes(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_changes_type ON inventory_changes(change_type);

-- Enable RLS
ALTER TABLE inventory_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory_changes" ON inventory_changes FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_changes;
