-- Fix email unique constraint issue
-- This migration handles duplicate empty emails and ensures proper NULL handling

-- Step 1: Update empty string emails to NULL
UPDATE clients 
SET email = NULL 
WHERE email = '' OR email IS NULL OR trim(email) = '';

-- Step 2: Update empty string phones to NULL (for consistency)
UPDATE clients 
SET phone = NULL 
WHERE phone = '' OR phone IS NULL OR trim(phone) = '';

-- Step 3: Drop and recreate the email unique constraint to allow multiple NULLs
-- (Most databases allow multiple NULL values in unique constraints by default)
DO $$ 
BEGIN
    -- Drop existing email unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'clients_email_key' 
        AND table_name = 'clients'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT clients_email_key;
    END IF;
    
    -- Recreate unique constraint that allows multiple NULLs but prevents duplicate non-NULL emails
    ALTER TABLE clients 
    ADD CONSTRAINT clients_email_unique 
    UNIQUE (email);
    
END $$;

-- Step 4: Add partial unique index to ensure email uniqueness only for non-NULL values
-- (This is extra safety in case the constraint behaves differently)
DROP INDEX IF EXISTS idx_clients_email_unique;
CREATE UNIQUE INDEX idx_clients_email_unique 
ON clients (email) 
WHERE email IS NOT NULL AND trim(email) != '';

-- Step 5: Add similar handling for phone numbers (optional, for future-proofing)
DROP INDEX IF EXISTS idx_clients_phone_unique;
-- Note: We don't create a unique constraint for phone as multiple clients might not have phones
-- But we could add this in the future if needed 