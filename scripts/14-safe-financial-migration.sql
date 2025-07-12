-- Safe financial migration that handles existing constraints and fields
-- This version checks for existing elements before creating them

-- Add the missing financial fields (IF NOT EXISTS)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS expenses DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_received DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_pending DECIMAL(10,2) DEFAULT 0;

-- Drop existing constraints if they exist, then recreate them
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_payment_status;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_currency;

-- Add check constraints for valid values
ALTER TABLE projects 
ADD CONSTRAINT check_payment_status 
CHECK (payment_status IN ('pending', 'paid', 'overdue', 'partial', 'cancelled'));

ALTER TABLE projects 
ADD CONSTRAINT check_currency 
CHECK (currency IN ('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'));

-- Add indexes for better performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_projects_payment_status ON projects(payment_status);
CREATE INDEX IF NOT EXISTS idx_projects_currency ON projects(currency);

-- Update profit_margin field to handle large values
ALTER TABLE projects 
ALTER COLUMN profit_margin TYPE DECIMAL(12,2);

-- Add comments to document the new fields
COMMENT ON COLUMN projects.expenses IS 'Total expenses incurred for this project';
COMMENT ON COLUMN projects.revenue IS 'Total revenue generated from this project';
COMMENT ON COLUMN projects.profit_margin IS 'Profit amount or percentage (flexible field for profit calculations)';
COMMENT ON COLUMN projects.currency IS 'Currency code (ISO 4217)';
COMMENT ON COLUMN projects.payment_status IS 'Current payment status of the project';
COMMENT ON COLUMN projects.invoice_amount IS 'Total amount invoiced for this project';
COMMENT ON COLUMN projects.payment_received IS 'Amount actually received from client';
COMMENT ON COLUMN projects.payment_pending IS 'Amount still pending payment';

-- Create a function to automatically calculate profit margin
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

-- Create trigger to automatically update profit margin
DROP TRIGGER IF EXISTS trigger_calculate_profit_margin ON projects;
CREATE TRIGGER trigger_calculate_profit_margin
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_profit_margin();

-- Update existing records to set sensible defaults (only update NULL values)
UPDATE projects 
SET 
    expenses = COALESCE(expenses, 0),
    revenue = COALESCE(revenue, COALESCE(budget, 0)),
    currency = COALESCE(currency, 'USD'),
    payment_status = COALESCE(payment_status, 'pending'),
    invoice_amount = COALESCE(invoice_amount, COALESCE(budget, 0)),
    payment_received = COALESCE(payment_received, 0),
    payment_pending = COALESCE(payment_pending, COALESCE(budget, 0))
WHERE expenses IS NULL OR revenue IS NULL OR currency IS NULL OR payment_status IS NULL 
   OR invoice_amount IS NULL OR payment_received IS NULL OR payment_pending IS NULL;

-- Display the updated schema for verification
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
    AND table_schema = 'public'
    AND column_name IN ('budget', 'expenses', 'revenue', 'profit_margin', 'invoice_amount', 'payment_received', 'payment_pending', 'currency', 'payment_status')
ORDER BY ordinal_position; 