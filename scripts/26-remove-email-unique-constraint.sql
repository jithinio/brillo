-- Remove email unique constraint to allow same clients across different users
-- This allows User X and User Y to both have the same client with the same email

-- Step 1: Drop the existing email unique constraint
DO $$ 
BEGIN
    -- Drop existing email unique constraint if it exists (from previous migrations)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_email_unique' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT clients_email_unique;
    END IF;
    
    -- Also drop the old constraint name if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_email_key' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT clients_email_key;
    END IF;
END $$;

-- Step 2: Drop the unique index as well
DROP INDEX IF EXISTS idx_clients_email_unique;

-- Step 3: Create a regular index for performance (non-unique)
CREATE INDEX IF NOT EXISTS idx_clients_email_performance 
ON clients (email) 
WHERE email IS NOT NULL AND trim(email) != '';

-- Step 4: Optionally, create a composite unique constraint per user (if user isolation is needed)
-- Uncomment the following if you want to ensure one client per email per user:
-- ALTER TABLE clients 
-- ADD CONSTRAINT clients_email_user_unique 
-- UNIQUE (user_id, email);

-- Note: Since this is a multi-tenant system with RLS, different users can have
-- the same client with the same email address, which is the desired behavior.