-- Add date_format column to company_settings table
-- This allows users to customize how dates are displayed across the application

-- Add the date_format column with a default value
ALTER TABLE company_settings 
ADD COLUMN date_format TEXT DEFAULT 'MM/DD/YYYY';

-- Add a check constraint to ensure only valid date formats are stored
ALTER TABLE company_settings 
ADD CONSTRAINT valid_date_format 
CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY', 'DD-MM-YYYY', 'MMM DD, YYYY', 'DD MMM YYYY'));

-- Update existing records to have the default date format
UPDATE company_settings 
SET date_format = 'MM/DD/YYYY' 
WHERE date_format IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE company_settings 
ALTER COLUMN date_format SET NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN company_settings.date_format IS 'User preference for date display format across the application'; 