-- Update image_url column to support base64 data URLs (which can be very long)
-- Run this in Azure Portal → SQL Database → Query Editor

-- Check current column definition
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'campaigns' 
  AND COLUMN_NAME = 'image_url';
GO

-- Update column to NVARCHAR(MAX) if it's not already
-- This allows storing very long base64 data URLs (up to 2GB)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('campaigns') AND name = 'image_url')
BEGIN
    -- Check if column is already NVARCHAR(MAX)
    DECLARE @CurrentMaxLength INT;
    SELECT @CurrentMaxLength = CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'campaigns' 
      AND COLUMN_NAME = 'image_url';
    
    -- Only alter if not already MAX
    IF @CurrentMaxLength IS NOT NULL AND @CurrentMaxLength <> -1
    BEGIN
        ALTER TABLE campaigns
        ALTER COLUMN image_url NVARCHAR(MAX) NULL;
        
        PRINT 'Updated image_url column to NVARCHAR(MAX) to support base64 data URLs.';
    END
    ELSE
    BEGIN
        PRINT 'image_url column is already NVARCHAR(MAX) or compatible. No changes needed.';
    END
END
ELSE
BEGIN
    PRINT 'ERROR: image_url column does not exist in campaigns table.';
END
GO

-- Verify the change
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'campaigns' 
  AND COLUMN_NAME = 'image_url';
GO

PRINT '';
PRINT 'Migration complete! The image_url column can now store base64 data URLs.';
PRINT 'Note: Base64 data URLs are typically 30-50% larger than the original image file.';
PRINT 'With compression (max 1200px, 80% quality), most images will be under 500KB as base64.';
GO

