-- Add currency column to invoices table
-- This migration adds support for per-invoice currency selection

-- Step 1: Add currency column to invoices table
DO $$ 
BEGIN
    -- Check if currency column doesn't exist before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE invoices 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
        
        RAISE NOTICE 'Added currency column to invoices table';
    ELSE
        RAISE NOTICE 'Currency column already exists in invoices table';
    END IF;
END $$;

-- Step 2: Add index for currency column for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_currency 
ON invoices (currency);

-- Step 3: Add a check constraint to ensure valid currency codes
-- This ensures only supported currency codes can be used
DO $$
BEGIN
    -- Check if constraint doesn't exist before adding it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'invoices_currency_check'
        AND table_name = 'invoices'
    ) THEN
        ALTER TABLE invoices 
        ADD CONSTRAINT invoices_currency_check 
        CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY', 'INR'));
        
        RAISE NOTICE 'Added currency check constraint to invoices table';
    ELSE
        RAISE NOTICE 'Currency check constraint already exists in invoices table';
    END IF;
END $$;

-- Step 4: Update any existing invoices without currency to use USD as default
UPDATE invoices 
SET currency = 'USD' 
WHERE currency IS NULL;

RAISE NOTICE 'Migration 29 completed: Added currency support to invoices table';