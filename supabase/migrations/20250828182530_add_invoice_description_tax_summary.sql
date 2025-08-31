-- Add invoice_description and tax_summary fields to invoices table
-- This adds new fields for enhanced invoice content customization

-- Step 1: Add new columns to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_description TEXT,
ADD COLUMN IF NOT EXISTS tax_summary TEXT;

-- Step 2: Add new columns to company_settings table for default values
ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS default_invoice_description TEXT,
ADD COLUMN IF NOT EXISTS default_tax_summary TEXT;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN invoices.invoice_description IS 'Optional description text that appears below the invoice title';
COMMENT ON COLUMN invoices.tax_summary IS 'Optional tax summary information that appears before the notes section';
COMMENT ON COLUMN company_settings.default_invoice_description IS 'Default invoice description that auto-populates in new invoices';
COMMENT ON COLUMN company_settings.default_tax_summary IS 'Default tax summary that auto-populates in new invoices';
