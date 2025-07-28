-- Add relationship column to clients table
-- This migration adds a relationship field to track client engagement type

-- Add the relationship column with default value
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS relationship VARCHAR(20) DEFAULT 'regular';

-- Add a check constraint to ensure only valid relationship types
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_relationship_check' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients 
        ADD CONSTRAINT clients_relationship_check 
        CHECK (relationship IN ('recurring', 'one-time', 'regular'));
    END IF;
END $$;

-- Update any existing records to have the default relationship
UPDATE clients 
SET relationship = 'regular' 
WHERE relationship IS NULL; 