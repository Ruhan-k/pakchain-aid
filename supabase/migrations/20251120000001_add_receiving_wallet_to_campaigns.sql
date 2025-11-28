-- Add receiving_wallet_address field to campaigns table
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS receiving_wallet_address text;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_campaigns_receiving_wallet ON campaigns(receiving_wallet_address);

-- Add comment
COMMENT ON COLUMN campaigns.receiving_wallet_address IS 'Ethereum wallet address that receives donations for this campaign';


