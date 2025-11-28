-- Drop the unique constraint on wallet_address temporarily
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_wallet_address_key;

-- Make wallet_address nullable to support users without wallets initially
ALTER TABLE users 
ALTER COLUMN wallet_address DROP NOT NULL;

-- Add auth_user_id and email fields to users table for linking auth users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS email text;

-- Re-add unique constraint only for non-null wallet addresses
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_unique 
ON users(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Update RLS policy to allow users to insert their own records
CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Allow users to update their own records
CREATE POLICY IF NOT EXISTS "Users can update their own profile by auth_user_id"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

