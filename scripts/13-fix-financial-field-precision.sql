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
    AND column_name IN ('budget', 'expenses', 'revenue', 'profit_margin', 'invoice_amount', 'payment_received', 'payment_pending')
ORDER BY ordinal_position; 