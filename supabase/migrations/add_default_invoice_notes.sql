-- Add default_invoice_notes column to company_settings table
-- This allows users to set default notes that will auto-populate in new invoices

ALTER TABLE company_settings 
ADD COLUMN IF NOT EXISTS default_invoice_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.default_invoice_notes IS 'Default notes that auto-populate in new invoices. Can be overridden for individual invoices.';
