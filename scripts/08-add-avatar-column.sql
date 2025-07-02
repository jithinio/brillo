-- Add avatar_url column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add a comment to the column
COMMENT ON COLUMN clients.avatar_url IS 'URL or base64 data for client avatar image'; 