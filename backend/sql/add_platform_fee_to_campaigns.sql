-- Add platform fee fields to campaigns table
-- Run this in Azure Portal → SQL Database → Query Editor

-- Check if columns already exist before adding
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('campaigns') AND name = 'platform_fee_address')
BEGIN
    ALTER TABLE campaigns
    ADD platform_fee_address NVARCHAR(255) NULL;
    
    PRINT 'Added platform_fee_address column to campaigns table.';
END
ELSE
BEGIN
    PRINT 'platform_fee_address column already exists.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('campaigns') AND name = 'platform_fee_amount')
BEGIN
    ALTER TABLE campaigns
    ADD platform_fee_amount NVARCHAR(255) NULL; -- Stored as string to handle large numbers (in wei)
    
    PRINT 'Added platform_fee_amount column to campaigns table.';
END
ELSE
BEGIN
    PRINT 'platform_fee_amount column already exists.';
END
GO

-- Add comments
EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Ethereum address to receive platform fees (optional). If set, platform_fee_amount will be deducted from each donation.', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'campaigns', 
    @level2type = N'COLUMN', @level2name = N'platform_fee_address';
GO

EXEC sp_addextendedproperty 
    @name = N'MS_Description', 
    @value = N'Platform fee amount per transaction in wei (optional). This amount is added to the donation amount and sent to platform_fee_address.', 
    @level0type = N'SCHEMA', @level0name = N'dbo', 
    @level1type = N'TABLE', @level1name = N'campaigns', 
    @level2type = N'COLUMN', @level2name = N'platform_fee_amount';
GO

PRINT 'Platform fee columns added successfully!';
PRINT '';
PRINT 'Usage:';
PRINT '  - Set platform_fee_address to enable fee collection';
PRINT '  - Set platform_fee_amount in wei (e.g., 1000000000000000 for 0.001 ETH)';
PRINT '  - If platform_fee_address is NULL, no fee is collected';
GO

