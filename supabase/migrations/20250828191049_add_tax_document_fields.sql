-- Add tax document fields to company_settings table

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS tax_document_name TEXT,
ADD COLUMN IF NOT EXISTS tax_document_number TEXT;

-- Add comments for documentation
COMMENT ON COLUMN company_settings.tax_document_name IS 'Name of tax document (e.g., PAN, SSN, NIF, etc.)';
COMMENT ON COLUMN company_settings.tax_document_number IS 'Tax document number (e.g., 123-45-6789, A1B2C3D4E5)';
