-- Add missing tax columns to company_settings table
-- Run this in your Supabase SQL Editor

ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS tax_jurisdiction TEXT,
ADD COLUMN IF NOT EXISTS tax_address TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings' 
  AND column_name IN ('tax_id', 'tax_jurisdiction', 'tax_address')
ORDER BY column_name;
