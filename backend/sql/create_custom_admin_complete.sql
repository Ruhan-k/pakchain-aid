-- Create Custom Admin User - COMPLETE VERSION
-- Username: Ruhan Khalid
-- Password: @Rksj786125678
-- Email: khalidruhan854@gmail.com
--
-- IMPORTANT: First generate the password hash using one of these methods:
-- 1. Online: https://emn178.github.io/online-tools/sha256.html
--    Enter: @Rksj786125678
-- 2. Node.js: node -e "const crypto = require('crypto'); console.log(crypto.createHash('sha256').update('@Rksj786125678').digest('hex'));"
-- 3. Then replace the hash below with the generated hash

-- Delete old admin users
DELETE FROM admins WHERE username = 'admin' OR username = 'Ruhan Khalid';
GO

-- Insert new admin user
-- REPLACE THE HASH BELOW WITH YOUR GENERATED SHA-256 HASH
DECLARE @username NVARCHAR(50) = 'Ruhan Khalid';
DECLARE @password_hash NVARCHAR(255) = 'REPLACE_WITH_GENERATED_HASH_HERE'; -- ⚠️ REPLACE THIS!
DECLARE @email NVARCHAR(255) = 'khalidruhan854@gmail.com';
DECLARE @full_name NVARCHAR(255) = 'Ruhan Khalid';

INSERT INTO admins (username, email, full_name, password_hash, is_active)
VALUES (@username, @email, @full_name, @password_hash, 1);

PRINT 'Admin user created successfully!';
PRINT 'Username: Ruhan Khalid';
PRINT 'Email: khalidruhan854@gmail.com';
PRINT 'Password: @Rksj786125678';
GO

-- Verify the admin was created
SELECT username, email, is_active, LEN(password_hash) AS hash_length
FROM admins 
WHERE username = 'Ruhan Khalid';
GO

