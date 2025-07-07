-- Add invoice_template column to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS invoice_template JSONB DEFAULT NULL;
 
-- Comment on the column
COMMENT ON COLUMN company_settings.invoice_template IS 'Stores the customized invoice template settings as JSON'; 