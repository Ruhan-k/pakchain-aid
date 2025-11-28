-- ============================================================================
-- FIX RLS POLICIES TO ALLOW DATA INSERTION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================================

-- 1. FIX DONATIONS INSERT POLICY
-- Allow donations to be recorded even without authentication (wallet-only users)
DROP POLICY IF EXISTS "Authenticated users can record donations" ON donations;

CREATE POLICY "Anyone can record donations"
  ON donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 2. FIX USERS INSERT POLICY
-- Allow wallet-only users (anon) and authenticated users to create records
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

-- Policy for authenticated users (with auth_user_id check)
CREATE POLICY "Authenticated users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- Policy for wallet-only users (when making donations without auth)
CREATE POLICY "Allow wallet-only user creation"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Allow if wallet_address is provided (wallet-only user)
    wallet_address IS NOT NULL
    OR
    -- Allow if authenticated and auth_user_id matches
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
  );

-- 3. FIX USERS UPDATE POLICY
-- Allow updates for wallet-based users too (for donation tracking)
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile by auth_user_id" ON users;

-- More permissive update policy
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. VERIFY POLICIES WERE CREATED
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename IN ('users', 'donations')
ORDER BY tablename, policyname;

