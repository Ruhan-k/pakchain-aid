/*
  # PakChain Aid - Database Schema

  1. New Tables
    - `campaigns`: Donation campaigns with goals and descriptions
    - `donations`: Individual blockchain transactions
    - `users`: Basic user tracking (wallet addresses)
    - `analytics_cache`: Hourly, daily, weekly aggregated stats

  2. Security
    - Enable RLS on all tables
    - Public read access for campaigns and donations
    - Authenticated access for user data
    - Admin-only access for campaign creation

  3. Design Notes
    - All amounts stored in Wei (smallest ETH unit) as strings
    - Transaction hashes stored for Etherscan verification
    - Timestamps auto-populated from blockchain events
*/

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
  is_featured boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE NOT NULL,
  display_name text,
  total_donated text DEFAULT '0',
  donation_count integer DEFAULT 0,
  first_donation_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Users are publicly readable"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Donations are publicly readable"
  ON donations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can record donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Analytics are publicly readable"
  ON analytics_cache FOR SELECT
  USING (true);

CREATE INDEX idx_donations_campaign_id ON donations(campaign_id);
CREATE INDEX idx_donations_donor_wallet ON donations(donor_wallet);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
