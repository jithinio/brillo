-- Add source column to clients table
-- This tracks where the client came from (e.g., "referral", "website", "social media", "cold outreach", etc.)

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Add index for better query performance on source filtering
CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source);

-- Add check constraint to ensure reasonable source values (optional but recommended)
-- This can be expanded based on your business needs
ALTER TABLE clients 
ADD CONSTRAINT check_clients_source_length 
CHECK (source IS NULL OR LENGTH(source) <= 100);

-- Comment on the column for documentation
COMMENT ON COLUMN clients.source IS 'Source of client acquisition (e.g., referral, website, social media, cold outreach)';

-- Optional: Set a default value for existing clients if desired
-- UPDATE clients SET source = 'existing' WHERE source IS NULL;

-- Grant permissions to authenticated users
-- The existing RLS policies should handle access control automatically
