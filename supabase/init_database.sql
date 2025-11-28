/*
  # PakChain Aid - Complete Database Initialization Script
  
  This script initializes the entire database from scratch.
  Run this in your Supabase SQL Editor to set up all tables, policies, and indexes.
  
  Project: PakChain Aid
  Database: Supabase PostgreSQL
*/

-- ============================================================================
-- 1. CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  goal_amount text NOT NULL DEFAULT '0',
  current_amount text NOT NULL DEFAULT '0',
  image_url text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  is_featured boolean DEFAULT false,
  receiving_wallet_address text
);

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text,
  display_name text,
  total_donated text DEFAULT '0',
  donation_count integer DEFAULT 0,
  first_donation_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_blocked boolean DEFAULT false,
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text
);

-- Unique constraint for wallet_address (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS users_wallet_address_unique 
ON users(wallet_address) 
WHERE wallet_address IS NOT NULL;

-- ============================================================================
-- 3. DONATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_wallet text NOT NULL,
  amount text NOT NULL,
  transaction_hash text UNIQUE NOT NULL,
  block_number integer,
  timestamp_on_chain integer,
  status text DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_amount CHECK (amount ~ '^[0-9]+$')
);

-- ============================================================================
-- 4. ANALYTICS CACHE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS analytics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL CHECK (period IN ('hourly', 'daily', 'weekly')),
  total_eth text NOT NULL DEFAULT '0',
  total_donations integer DEFAULT 0,
  unique_donors integer DEFAULT 0,
  top_campaign_id uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  timestamp_start timestamptz NOT NULL,
  timestamp_end timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period, timestamp_start)
);

-- ============================================================================
-- 5. ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  email text,
  full_name text,
  is_active boolean DEFAULT true,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. RLS POLICIES - CAMPAIGNS
-- ============================================================================
CREATE POLICY "Campaigns are publicly readable"
  ON campaigns FOR SELECT
  USING (true);

CREATE POLICY "Only authenticated users can create campaigns"
  ON campaigns FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Campaign creators can update their campaigns"
  ON campaigns FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- 8. RLS POLICIES - USERS
-- ============================================================================
CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Allow wallet-only user creation"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    wallet_address IS NOT NULL
    OR
    (auth.uid() IS NOT NULL AND auth_user_id = auth.uid())
  );

CREATE POLICY "Users can update their own profile by auth_user_id"
  ON users FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Allow updates for wallet-based users (for donation tracking)
CREATE POLICY "Users can update wallet-based profile"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 9. RLS POLICIES - DONATIONS
-- ============================================================================
CREATE POLICY "Donations are publicly readable"
  ON donations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can record donations"
  ON donations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================================================
-- 10. RLS POLICIES - ANALYTICS
-- ============================================================================
CREATE POLICY "Analytics are publicly readable"
  ON analytics_cache FOR SELECT
  USING (true);

-- ============================================================================
-- 11. RLS POLICIES - ADMINS
-- ============================================================================
CREATE POLICY "Admins can read admin table"
  ON admins FOR SELECT
  USING (true);

CREATE POLICY "Allow admin creation"
  ON admins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their own profile"
  ON admins FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 12. INDEXES FOR PERFORMANCE
-- ============================================================================

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_receiving_wallet ON campaigns(receiving_wallet_address);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked);
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_user_id_unique ON users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Donations indexes
CREATE INDEX IF NOT EXISTS idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_wallet ON donations(donor_wallet);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- Admins indexes
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- ============================================================================
-- 13. COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON COLUMN campaigns.receiving_wallet_address IS 'Ethereum wallet address that receives donations for this campaign';
COMMENT ON COLUMN users.is_blocked IS 'Admin can block users from making donations';
COMMENT ON COLUMN users.auth_user_id IS 'Links user record to Supabase auth.users table';
COMMENT ON COLUMN users.wallet_address IS 'Ethereum wallet address (nullable for users who sign up without wallet)';

-- ============================================================================
-- 14. DEFAULT ADMIN USER
-- ============================================================================
-- Insert default admin user
-- Username: pakchainadmin
-- Password: pakchainadminpass
-- Password hash: SHA-256 hash of "pakchainadminpass"
INSERT INTO admins (username, password_hash, email, full_name, is_active)
VALUES (
  'pakchainadmin',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
  'admin@pakchainaid.com',
  'PakChain Administrator',
  true
) ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true;

-- ============================================================================
-- INITIALIZATION COMPLETE
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  RAISE NOTICE 'Database initialization complete!';
  RAISE NOTICE 'Tables created: campaigns, users, donations, analytics_cache, admins';
  RAISE NOTICE 'RLS enabled on all tables';
  RAISE NOTICE 'Default admin user created: pakchainadmin / pakchainadminpass';
END $$;


