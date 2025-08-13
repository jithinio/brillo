-- Migration to update the currency constraint on invoices table
-- This adds support for all currencies defined in the frontend CURRENCIES object

-- First, drop the existing constraint if it exists
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_currency_check;

-- Add the updated constraint with all supported currencies
ALTER TABLE invoices 
ADD CONSTRAINT invoices_currency_check 
CHECK (currency IN (
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CNY',
  'CAD', 'AUD', 'NZD',
  'INR', 'SGD', 'HKD', 'MYR', 'IDR',
  'AED', 'SAR', 'KWD',
  'RUB'
));

-- Also update the currency column in company_settings table if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'company_settings'
  ) THEN
    ALTER TABLE company_settings 
    DROP CONSTRAINT IF EXISTS company_settings_default_currency_check;
    
    ALTER TABLE company_settings 
    ADD CONSTRAINT company_settings_default_currency_check 
    CHECK (default_currency IN (
      'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CNY',
      'CAD', 'AUD', 'NZD',
      'INR', 'SGD', 'HKD', 'MYR', 'IDR',
      'AED', 'SAR', 'KWD',
      'RUB'
    ));
  END IF;
END $$;

-- Add a comment to document the constraint
COMMENT ON CONSTRAINT invoices_currency_check ON invoices IS 'Ensures currency code is one of the supported currencies in the application';
