# Financial Migration Guide

## Overview
This guide will help you transform your projects table from time-tracking to financial tracking by adding the necessary fields.

## Step 1: Access Supabase SQL Editor
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Copy and Run the Migration SQL
Copy the entire SQL below and paste it into the SQL Editor, then click **Run**:

```sql
-- Add financial tracking fields to projects table
-- This migration transforms the projects table from time-tracking to financial tracking

-- Add the missing financial fields
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_received DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_pending DECIMAL(10,2) DEFAULT 0;

-- Add check constraints for valid values
ALTER TABLE projects 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial', 'cancelled'));

ALTER TABLE projects 
ADD CONSTRAINT check_currency 
CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'));

-- Add indexes for better performance on financial queries
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON projects(payment_status);
CREATE INDEX IF NOT EXISTS idx_projects_currency ON projects(currency);

-- Add comments to document the new fields
COMMENT ON COLUMN projects.expenses IS 'Total expenses incurred for this project';
COMMENT ON COLUMN projects.revenue IS 'Total revenue generated from this project';
COMMENT ON COLUMN projects.profit_margin IS 'Profit margin percentage (calculated as (revenue - expenses) / revenue * 100)';
COMMENT ON COLUMN projects.currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN projects.payment_status IS 'Current payment status of the project';
COMMENT ON COLUMN projects.invoice_amount IS 'Total amount invoiced for this project';
COMMENT ON COLUMN projects.payment_received IS 'Amount actually received from client';
COMMENT ON COLUMN projects.payment_pending IS 'Amount still pending payment';

-- Create a function to automatically calculate profit margin
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate profit margin when revenue or expenses change
    IF NEW.revenue > 0 THEN
        NEW.profit_margin = ROUND(((NEW.revenue - NEW.expenses) / NEW.revenue * 100), 2);
    ELSE
        NEW.profit_margin = 0;
    END IF;
    
    -- Update payment_pending based on invoice_amount and payment_received
    NEW.payment_pending = NEW.invoice_amount - NEW.payment_received;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update profit margin
DROP TRIGGER IF EXISTS trigger_calculate_profit_margin ON projects;
CREATE TRIGGER trigger_calculate_profit_margin
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_profit_margin();

-- Update existing records to set sensible defaults
UPDATE projects 
SET 
    expenses = 0,
    revenue = COALESCE(budget, 0),
    currency = 'USD',
    payment_status = 'pending',
    invoice_amount = COALESCE(budget, 0),
    payment_received = 0,
    payment_pending = COALESCE(budget, 0)
WHERE expenses IS NULL;
```

## Step 3: Fix Field Precision for Large Values
If you plan to import data with large monetary values (over 999.99), run this additional SQL to increase field precision:

```sql
-- Fix precision issues with financial fields
-- The profit_margin field needs to handle large absolute values, not just percentages

-- Increase precision for profit_margin to handle large absolute values
ALTER TABLE projects 
ALTER COLUMN profit_margin TYPE DECIMAL(12,2);

-- Update the comment to reflect that this can store absolute profit amounts
COMMENT ON COLUMN projects.profit_margin IS 'Profit amount or percentage (flexible field for profit calculations)';

-- Update the profit margin calculation function to handle both percentage and absolute values
CREATE OR REPLACE FUNCTION calculate_profit_margin()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-calculate if profit_margin is not explicitly set
    -- This allows import to set absolute values while still supporting percentage calculation
    IF NEW.profit_margin IS NULL OR NEW.profit_margin = 0 THEN
        -- Calculate profit margin percentage when revenue or expenses change
        IF NEW.revenue > 0 THEN
            NEW.profit_margin = ROUND(((NEW.revenue - NEW.expenses) / NEW.revenue * 100), 2);
        ELSE
            NEW.profit_margin = 0;
        END IF;
    END IF;
    
    -- Update payment_pending based on invoice_amount and payment_received
    NEW.payment_pending = NEW.invoice_amount - NEW.payment_received;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Step 4: Verify the Migration
After running the SQL, verify it worked by running this query:

```sql
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
```

You should see the new financial fields:
- `expenses` (DECIMAL)
- `revenue` (DECIMAL)
- `profit_margin` (DECIMAL)
- `currency` (VARCHAR)
- `payment_status` (VARCHAR)
- `invoice_amount` (DECIMAL)
- `payment_received` (DECIMAL)
- `payment_pending` (DECIMAL)

## Step 5: Fix Status Constraint (If Needed)
If you encounter a "projects_status_check" constraint violation during CSV import, run this SQL to fix the status constraint:

```sql
-- Fix the status constraint to include additional status values used in CSV import
-- This resolves the "projects_status_check" constraint violation

-- Drop the existing status constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the new status constraint with additional values
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'in_progress', 'pending', 'draft'));
```

## Step 6: Test the Migration
After the migration, run this test script to verify everything is working:

```bash
node scripts/test-financial-migration.js
```

## New Financial Fields Explained

### Core Financial Fields
- **`expenses`**: Total expenses incurred for this project
- **`revenue`**: Total revenue generated from this project
- **`profit_margin`**: Automatically calculated profit margin percentage

### Payment Tracking
- **`payment_status`**: Current payment status (`pending`, `paid`, `overdue`, `partial`, `cancelled`)
- **`invoice_amount`**: Total amount invoiced for this project
- **`payment_received`**: Amount actually received from client
- **`payment_pending`**: Amount still pending payment (auto-calculated)

### Internationalization
- **`currency`**: Currency code (ISO 4217) - supports USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR

## Automatic Calculations
The system now automatically calculates:
1. **Profit Margin**: `(revenue - expenses) / revenue * 100`
2. **Payment Pending**: `invoice_amount - payment_received`

These calculations happen whenever you update the relevant fields.

## Import/Export Support
Your CSV import/export system now supports all these financial fields. The field mapping will automatically detect:
- Budget → Revenue
- Expenses → Expenses  
- Payment Status → Payment Status
- Currency → Currency
- And more!

## Troubleshooting

### Common Issues

**"numeric field overflow" Error During CSV Import**
- **Problem**: Error like "A field with precision 5, scale 2 must round to an absolute value less than 10^3"
- **Solution**: Make sure you ran Step 3 (Fix Field Precision) to handle large monetary values
- **Explanation**: The default `profit_margin` field can only store values up to 999.99, but large amounts like ₹670,000 require higher precision

**Migration Fails with Permission Errors**
- **Problem**: "permission denied" or "insufficient_privilege" errors
- **Solution**: Make sure you're using the Supabase SQL Editor with proper admin access
- **Alternative**: Contact your Supabase project admin to run the migration

**Fields Not Showing Up**
- **Problem**: New financial fields don't appear in your application
- **Solution**: Restart your development server and clear browser cache
- **Check**: Run the verification query in Step 4 to confirm fields were added

**Import Still Failing After Migration**
- **Problem**: CSV import continues to fail even after migration
- **Solution**: Check that both Step 2 and Step 3 migrations were completed successfully
- **Debug**: Look at the exact error message in browser console for specific field issues

### General Troubleshooting Steps
1. Check that you have the necessary permissions in Supabase
2. Verify both migration SQLs (Step 2 and Step 3) ran without errors
3. Run the test script to confirm the fields are accessible
4. Check the Supabase logs for any error messages
5. Restart your development server after database changes

## Next Steps
After completing this migration:
1. Update your frontend components to use the new financial fields
2. Test the CSV import functionality with financial data
3. Consider adding financial reporting features to your dashboard 