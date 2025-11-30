-- Verify Admin Setup
-- Run this to check if admin user is set up correctly

-- Check if admins table exists
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'admins')
BEGIN
    PRINT '✅ Admins table exists';
END
ELSE
BEGIN
    PRINT '❌ Admins table does NOT exist';
    PRINT '💡 Run: backend/sql/create_admins_table.sql';
END
GO

-- Check if admin user exists
IF EXISTS (SELECT 1 FROM admins WHERE username = 'admin')
BEGIN
    PRINT '✅ Admin user exists';
    
    -- Show admin details (without password hash for security)
    -- Check if created_at column exists
    DECLARE @has_created_at BIT = 0;
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('admins') AND name = 'created_at')
    BEGIN
        SET @has_created_at = 1;
    END
    
    IF @has_created_at = 1
    BEGIN
        SELECT 
            username,
            email,
            full_name,
            is_active,
            CASE 
                WHEN password_hash IS NULL THEN '❌ NULL'
                WHEN LEN(password_hash) = 64 THEN '✅ Valid (64 chars)'
                ELSE '⚠️ Invalid length: ' + CAST(LEN(password_hash) AS VARCHAR)
            END AS password_hash_status,
            created_at
        FROM admins 
        WHERE username = 'admin';
    END
    ELSE
    BEGIN
        SELECT 
            username,
            email,
            full_name,
            is_active,
            CASE 
                WHEN password_hash IS NULL THEN '❌ NULL'
                WHEN LEN(password_hash) = 64 THEN '✅ Valid (64 chars)'
                ELSE '⚠️ Invalid length: ' + CAST(LEN(password_hash) AS VARCHAR)
            END AS password_hash_status
        FROM admins 
        WHERE username = 'admin';
    END
    
    -- Check password hash
    DECLARE @expected_hash NVARCHAR(255) = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
    DECLARE @actual_hash NVARCHAR(255);
    
    SELECT @actual_hash = LOWER(LTRIM(RTRIM(password_hash))) 
    FROM admins 
    WHERE username = 'admin';
    
    IF @actual_hash = @expected_hash
    BEGIN
        PRINT '✅ Password hash is correct';
    END
    ELSE
    BEGIN
        PRINT '❌ Password hash does NOT match expected value';
        PRINT '   Expected: ' + @expected_hash;
        PRINT '   Actual:   ' + ISNULL(@actual_hash, 'NULL');
        PRINT '';
        PRINT '🔧 TO FIX:';
        PRINT '   Run: backend/sql/create_default_admin.sql';
        PRINT '   Or update manually:';
        PRINT '   UPDATE admins SET password_hash = ''' + @expected_hash + ''' WHERE username = ''admin'';';
    END
    
    -- Check if admin is active
    IF EXISTS (SELECT 1 FROM admins WHERE username = 'admin' AND is_active = 1)
    BEGIN
        PRINT '✅ Admin account is active';
    END
    ELSE
    BEGIN
        PRINT '❌ Admin account is INACTIVE';
        PRINT '🔧 TO FIX:';
        PRINT '   UPDATE admins SET is_active = 1 WHERE username = ''admin'';';
    END
END
ELSE
BEGIN
    PRINT '❌ Admin user does NOT exist';
    PRINT '💡 Run: backend/sql/create_default_admin.sql';
END
GO

PRINT '';
PRINT '=== SUMMARY ===';
PRINT 'If all checks pass, admin login should work with:';
PRINT '  Username: admin';
PRINT '  Password: admin123';
GO

