-- Add is_blocked field to users table for admin user management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);

-- Add comment
COMMENT ON COLUMN users.is_blocked IS 'Admin can block users from making donations';


