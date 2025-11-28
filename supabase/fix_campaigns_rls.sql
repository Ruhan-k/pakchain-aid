-- ============================================================================
-- FIX CAMPAIGNS RLS POLICY FOR ADMIN CAMPAIGN CREATION
-- Run this in Supabase SQL Editor to allow admins to create campaigns
-- ============================================================================

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Only authenticated users can create campaigns" ON campaigns;

-- Create a new policy that allows:
-- 1. Authenticated users to create campaigns (with created_by = auth.uid())
-- 2. Admins to create campaigns (with created_by IS NULL)
CREATE POLICY "Allow campaign creation"
  ON campaigns FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Allow if created_by matches the authenticated user
    (auth.uid() IS NOT NULL AND created_by = auth.uid())
    OR
    -- Allow if created_by is NULL (admin-created campaigns)
    created_by IS NULL
  );

-- Also update the UPDATE policy to allow admins to update campaigns
DROP POLICY IF EXISTS "Campaign creators can update their campaigns" ON campaigns;

CREATE POLICY "Allow campaign updates"
  ON campaigns FOR UPDATE
  TO anon, authenticated
  USING (
    -- Allow if user created the campaign
    (auth.uid() IS NOT NULL AND created_by = auth.uid())
    OR
    -- Allow if created_by is NULL (admin-created campaigns)
    created_by IS NULL
  )
  WITH CHECK (
    -- Same conditions for the new values
    (auth.uid() IS NOT NULL AND created_by = auth.uid())
    OR
    created_by IS NULL
  );

-- ============================================================================
-- VERIFY POLICIES
-- ============================================================================
-- Run this query to see all campaigns policies:
-- SELECT tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'campaigns'
-- ORDER BY policyname;

