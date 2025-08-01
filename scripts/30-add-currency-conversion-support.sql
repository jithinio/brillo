-- Add currency conversion support to projects table
-- This migration adds fields to track currency conversions for pipeline projects

DO $$ 
BEGIN
    -- Add original_currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='original_currency') THEN
        ALTER TABLE projects ADD COLUMN original_currency VARCHAR(3);
    END IF;
    
    -- Add conversion_rate column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='conversion_rate') THEN
        ALTER TABLE projects ADD COLUMN conversion_rate DECIMAL(10,6);
    END IF;
    
    -- Add conversion_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='conversion_date') THEN
        ALTER TABLE projects ADD COLUMN conversion_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Update currency constraint to include supported currencies
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_currency;
ALTER TABLE projects ADD CONSTRAINT check_currency 
CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CNY', 'CAD', 'AUD', 'NZD', 'INR', 'SGD', 'HKD', 'MYR', 'IDR', 'AED', 'SAR', 'KWD', 'RUB'));

-- Add indexes for better performance on currency-related queries
CREATE INDEX IF NOT EXISTS idx_projects_currency ON projects(currency);
CREATE INDEX IF NOT EXISTS idx_projects_original_currency ON projects(original_currency);
CREATE INDEX IF NOT EXISTS idx_projects_conversion_date ON projects(conversion_date);

-- Add comments to document the new fields
COMMENT ON COLUMN projects.original_currency IS 'Original currency before conversion (for converted pipeline projects)';
COMMENT ON COLUMN projects.conversion_rate IS 'Exchange rate used for currency conversion (from original to target currency)';
COMMENT ON COLUMN projects.conversion_date IS 'Date when currency conversion was applied';

-- Display confirmation
SELECT 'Currency conversion support added to projects table' as status;