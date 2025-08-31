-- Add authorized signature field to company_settings table

ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS authorized_signature TEXT;

-- Add comment for documentation
COMMENT ON COLUMN company_settings.authorized_signature IS 'URL to authorized signature image for invoices. Stores uploaded file URLs from Supabase Storage or external URLs.';
