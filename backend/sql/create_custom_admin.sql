-- Create Custom Admin User
-- Username: Ruhan Khalid
-- Password: @Rksj786125678
-- Email: khalidruhan854@gmail.com

-- Step 1: Delete old admin user (if exists)
DELETE FROM admins WHERE username = 'admin' OR username = 'Ruhan Khalid';
GO

-- Step 2: Insert new admin user
-- Password hash for '@Rksj786125678' (SHA-256)
DECLARE @username NVARCHAR(50) = 'Ruhan Khalid';
DECLARE @password_hash NVARCHAR(255) = 'a8f5f167f44f4964e6c998dee827110c'; -- This will be updated with correct hash
DECLARE @email NVARCHAR(255) = 'khalidruhan854@gmail.com';
DECLARE @full_name NVARCHAR(255) = 'Ruhan Khalid';

INSERT INTO admins (username, email, full_name, password_hash, is_active)
VALUES (@username, @email, @full_name, @password_hash, 1);

PRINT 'Admin user created successfully!';
PRINT 'Username: Ruhan Khalid';
PRINT 'Email: khalidruhan854@gmail.com';
PRINT 'Password: @Rksj786125678';
PRINT '';
PRINT '⚠️ IMPORTANT: Update the password_hash above with the correct SHA-256 hash!';
PRINT '   Run the hash generation command first (see instructions below)';
GO

