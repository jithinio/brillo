-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON clients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at 
    BEFORE UPDATE ON invoices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate invoice totals
CREATE OR REPLACE FUNCTION calculate_invoice_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate totals when invoice items change
    UPDATE invoices 
    SET 
        amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ),
        tax_amount = (
            SELECT COALESCE(SUM(amount), 0) * COALESCE(tax_rate, 0) / 100
            FROM invoice_items 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        )
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Update total amount
    UPDATE invoices 
    SET total_amount = amount + tax_amount
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for invoice calculations
DROP TRIGGER IF EXISTS calculate_invoice_totals_insert ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_insert 
    AFTER INSERT ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS calculate_invoice_totals_update ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_update 
    AFTER UPDATE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();

DROP TRIGGER IF EXISTS calculate_invoice_totals_delete ON invoice_items;
CREATE TRIGGER calculate_invoice_totals_delete 
    AFTER DELETE ON invoice_items 
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_totals();
