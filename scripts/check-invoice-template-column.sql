-- Check if invoice_template column exists in company_settings table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'company_settings'
    AND table_schema = 'public'
    AND column_name = 'invoice_template';

-- Also check if the table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
) as table_exists;

-- Show all columns in company_settings table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'company_settings'
    AND table_schema = 'public'
ORDER BY ordinal_position; 