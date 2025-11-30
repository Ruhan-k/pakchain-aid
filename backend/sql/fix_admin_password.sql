-- Fix Admin Password Hash
-- This will update the admin password to the correct hash for 'admin123'

-- Expected hash for 'admin123' (SHA-256)
DECLARE @correct_hash NVARCHAR(255) = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';

-- Update the password hash
UPDATE admins 
SET password_hash = @correct_hash
WHERE username = 'admin';

-- Verify the update
IF @@ROWCOUNT > 0
BEGIN
    PRINT '✅ Password hash updated successfully!';
    PRINT 'Username: admin';
    PRINT 'Password: admin123';
    PRINT '';
    PRINT 'You can now login with these credentials.';
END
ELSE
BEGIN
    PRINT '❌ No admin user found with username "admin"';
    PRINT '💡 Make sure the admin user exists first.';
END
GO

-- Show the updated hash
SELECT 
    username,
    LOWER(LTRIM(RTRIM(password_hash))) AS password_hash,
    is_active
FROM admins 
WHERE username = 'admin';
GO

