
-- Update Schema for Inventory Sync
-- Adds ItemType and Local_Updated_At columns and trigger

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory') AND name = 'ItemType')
BEGIN
    ALTER TABLE Inventory ADD ItemType INT DEFAULT 0;
    PRINT 'Added ItemType column.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'Inventory') AND name = 'Local_Updated_At')
BEGIN
    ALTER TABLE Inventory ADD Local_Updated_At DATETIME DEFAULT GETDATE();
    PRINT 'Added Local_Updated_At column.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Inventory_UpdateTimestamp')
BEGIN
    EXEC('CREATE TRIGGER trg_Inventory_UpdateTimestamp ON Inventory AFTER UPDATE AS BEGIN UPDATE Inventory SET Local_Updated_At = GETDATE() FROM Inventory i INNER JOIN inserted ins ON i.ItemNum = ins.ItemNum; END');
    PRINT 'Created trg_Inventory_UpdateTimestamp trigger.';
END
GO

PRINT 'Schema update complete.';
