-- Add client_since column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_since DATE;

-- Set default value for existing clients to their created_at date
UPDATE clients SET client_since = DATE(created_at) WHERE client_since IS NULL;

-- Make the column NOT NULL after setting existing values
ALTER TABLE clients ALTER COLUMN client_since SET NOT NULL;

-- Set default for new records
ALTER TABLE clients ALTER COLUMN client_since SET DEFAULT CURRENT_DATE; 