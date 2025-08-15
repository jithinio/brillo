-- Migration: Add payment tracking to invoices
-- This adds payment_received and balance_due columns and partially_paid status

-- Step 1: Add payment tracking columns
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_received DECIMAL(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS balance_due DECIMAL(15, 2) DEFAULT 0.00;

-- Step 2: Update existing invoices to calculate balance_due based on current total_amount
UPDATE invoices 
SET balance_due = CASE 
  WHEN status = 'paid' THEN 0.00
  ELSE total_amount
END,
payment_received = CASE 
  WHEN status = 'paid' THEN total_amount
  ELSE 0.00
END;

-- Step 3: Add check constraints to ensure data integrity
ALTER TABLE invoices 
ADD CONSTRAINT check_payment_received_non_negative 
CHECK (payment_received >= 0),
ADD CONSTRAINT check_balance_due_non_negative 
CHECK (balance_due >= 0),
ADD CONSTRAINT check_payment_not_exceed_total 
CHECK (payment_received <= total_amount);

-- Step 4: Add updated_at column if it doesn't exist
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Step 5: Create function to automatically update balance_due when payment_received changes
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate balance due
  NEW.balance_due = NEW.total_amount - NEW.payment_received;
  
  -- Auto-update status based on payment
  IF NEW.payment_received = 0 THEN
    -- No payment received - keep original status unless it's paid
    IF OLD.status = 'paid' AND NEW.payment_received = 0 THEN
      NEW.status = 'sent'; -- Reset from paid to sent if payment is removed
    END IF;
  ELSIF NEW.payment_received >= NEW.total_amount THEN
    -- Fully paid
    NEW.status = 'paid';
    NEW.balance_due = 0.00; -- Ensure no rounding issues
  ELSIF NEW.payment_received > 0 AND NEW.payment_received < NEW.total_amount THEN
    -- Partially paid
    NEW.status = 'partially_paid';
  END IF;
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically update balance and status
DROP TRIGGER IF EXISTS trigger_update_invoice_balance ON invoices;
CREATE TRIGGER trigger_update_invoice_balance
  BEFORE UPDATE OF payment_received, total_amount ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_balance();

-- Step 7: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_payment_received ON invoices(payment_received);
CREATE INDEX IF NOT EXISTS idx_invoices_balance_due ON invoices(balance_due);
CREATE INDEX IF NOT EXISTS idx_invoices_status_payment ON invoices(status, payment_received);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN invoices.payment_received IS 'Amount of payment received for this invoice';
COMMENT ON COLUMN invoices.balance_due IS 'Remaining balance due (total_amount - payment_received)';
COMMENT ON FUNCTION update_invoice_balance() IS 'Automatically calculates balance_due and updates status based on payment_received';

-- Step 9: Update currency constraint to include the new status
ALTER TABLE invoices 
DROP CONSTRAINT IF EXISTS invoices_status_check;

ALTER TABLE invoices 
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'));

-- Step 10: Create function to check and update overdue invoices
CREATE OR REPLACE FUNCTION update_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update invoices to overdue status if they're past due date and not fully paid
  UPDATE invoices 
  SET status = 'overdue', updated_at = now()
  WHERE due_date < CURRENT_DATE
    AND status IN ('sent', 'partially_paid')
    AND balance_due > 0;
END;
$$;

-- Step 11: Add comment for the overdue function
COMMENT ON FUNCTION update_overdue_invoices() IS 'Updates invoices to overdue status when past due date and not fully paid';
