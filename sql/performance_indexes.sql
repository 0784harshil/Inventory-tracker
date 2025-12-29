-- Additional Performance Indexes for Faster Queries
-- Run this in your Supabase SQL Editor if queries are still slow

-- Composite index for inventory filtering by store + stock level
CREATE INDEX IF NOT EXISTS idx_inventory_store_stock 
ON inventory(store_id, in_stock);

-- Index for sorting by item_name
CREATE INDEX IF NOT EXISTS idx_inventory_item_name 
ON inventory(item_name);

-- Composite index for common dashboard queries
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
ON inventory(in_stock) 
WHERE in_stock > 0 AND in_stock < 10;

-- Index for text search on item_name (trigram for ILIKE queries)
-- Note: This requires the pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_inventory_item_name_trgm 
ON inventory USING gin (item_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_inventory_item_num_trgm 
ON inventory USING gin (item_num gin_trgm_ops);

-- Index for transfers ordering
CREATE INDEX IF NOT EXISTS idx_transfers_created_at_desc 
ON transfers(created_at DESC);

-- Composite index for sync_log queries
CREATE INDEX IF NOT EXISTS idx_sync_log_store_status_completed 
ON sync_log(store_id, status, completed_at DESC);

-- Analyze tables to update statistics
ANALYZE inventory;
ANALYZE stores;
ANALYZE transfers;
ANALYZE sync_log;
