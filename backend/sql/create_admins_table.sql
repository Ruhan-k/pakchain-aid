-- Create admins table for Azure SQL Database
-- Run this in Azure Portal → SQL Database → Query Editor

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'admins')
BEGIN
    CREATE TABLE admins (
        id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        username NVARCHAR(50) NOT NULL UNIQUE,
        email NVARCHAR(255) NULL,
        full_name NVARCHAR(255) NULL,
        password_hash NVARCHAR(255) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        last_login DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );

    -- Create index on username for faster lookups
    CREATE INDEX IX_admins_username ON admins(username);
    
    PRINT 'Admins table created successfully!';
END
ELSE
BEGIN
    PRINT 'Admins table already exists.';
END
GO

