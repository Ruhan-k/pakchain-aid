-- Create default admin user
-- Run this AFTER creating the admins table
-- 
-- IMPORTANT: Replace 'admin' and 'admin123' with your desired username and password
-- The password will be hashed using SHA-256

-- Step 1: Generate password hash
-- You can generate the hash using Node.js:
--   const crypto = require('crypto');
--   const hash = crypto.createHash('sha256').update('your-password').digest('hex');
--   console.log(hash);

-- Step 2: Insert admin user with the hashed password
-- Replace 'YOUR_PASSWORD_HASH_HERE' with the hash from Step 1

DECLARE @username NVARCHAR(50) = 'admin';
DECLARE @password_hash NVARCHAR(255) = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; -- This is hash for 'admin123'
DECLARE @email NVARCHAR(255) = 'admin@pakchainaid.com';
DECLARE @full_name NVARCHAR(255) = 'Administrator';

-- Check if admin already exists
IF NOT EXISTS (SELECT 1 FROM admins WHERE username = @username)
BEGIN
    INSERT INTO admins (username, email, full_name, password_hash, is_active)
    VALUES (@username, @email, @full_name, @password_hash, 1);
    
    PRINT 'Default admin user created successfully!';
    PRINT 'Username: admin';
    PRINT 'Password: admin123';
    PRINT '';
    PRINT '⚠️ IMPORTANT: Change the default password after first login!';
END
ELSE
BEGIN
    PRINT 'Admin user already exists.';
    PRINT 'To reset password, run:';
    PRINT 'UPDATE admins SET password_hash = ''YOUR_NEW_HASH'' WHERE username = ''admin'';';
END
GO

