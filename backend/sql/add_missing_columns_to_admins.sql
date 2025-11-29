-- Add missing columns to admins table if they don't exist
-- Run this if you get "Invalid column name" errors

-- Add created_at column if missing
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('admins') AND name = 'created_at')
BEGIN
    ALTER TABLE admins
    ADD created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE();
    
    PRINT '✅ Added created_at column to admins table';
END
ELSE
BEGIN
    PRINT '✅ created_at column already exists';
END
GO

-- Add updated_at column if missing
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('admins') AND name = 'updated_at')
BEGIN
    ALTER TABLE admins
    ADD updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE();
    
    PRINT '✅ Added updated_at column to admins table';
END
ELSE
BEGIN
    PRINT '✅ updated_at column already exists';
END
GO

PRINT '';
PRINT 'All columns verified!';
GO

