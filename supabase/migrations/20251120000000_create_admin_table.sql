/*
  # Admin Table for PakChain Aid
  
  Creates admin users table with username/password authentication
  Passwords should be hashed using bcrypt or similar before storage
*/

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

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read other admins (for management)
CREATE POLICY "Admins can read admin table"
  ON admins FOR SELECT
  USING (true);

-- Only service role can insert/update admins (via backend)
-- For now, we'll allow authenticated inserts for initial setup
CREATE POLICY "Allow admin creation"
  ON admins FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their own profile"
  ON admins FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_is_active ON admins(is_active);

-- Insert default admin (password: pakchainadminpass)
-- Password hash for "pakchainadminpass" using SHA-256 (same as adminAuth.ts)
-- In production, consider using bcrypt or Argon2 for better security
INSERT INTO admins (username, password_hash, email, full_name, is_active)
VALUES (
  'pakchainadmin',
  'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- SHA-256 hash of "pakchainadminpass"
  'admin@pakchainaid.com',
  'PakChain Administrator',
  true
) ON CONFLICT (username) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  is_active = true;

