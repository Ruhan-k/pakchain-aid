-- Check Admin Password Hash
-- Run this to see what hash is stored in the database

SELECT 
    username,
    password_hash AS stored_hash,
    LEN(password_hash) AS hash_length,
    LOWER(LTRIM(RTRIM(password_hash))) AS normalized_hash,
    is_active
FROM admins 
WHERE username = 'admin';
GO

-- Expected hash for 'admin123'
DECLARE @expected_hash NVARCHAR(255) = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
DECLARE @actual_hash NVARCHAR(255);

SELECT @actual_hash = LOWER(LTRIM(RTRIM(password_hash))) 
FROM admins 
WHERE username = 'admin';

PRINT '=== PASSWORD HASH CHECK ===';
PRINT 'Expected hash: ' + @expected_hash;
PRINT 'Actual hash:   ' + ISNULL(@actual_hash, 'NULL');
PRINT 'Match: ' + CASE WHEN @actual_hash = @expected_hash THEN '✅ YES' ELSE '❌ NO' END;
GO

