-- Enable Row Level Security (RLS) for all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're using mock auth)
-- In production, you would create user-specific policies

-- Clients policies
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON clients FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON clients FOR DELETE USING (true);

-- Projects policies
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON projects FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON projects FOR DELETE USING (true);

-- Invoices policies
CREATE POLICY "Enable read access for all users" ON invoices FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON invoices FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON invoices FOR DELETE USING (true);

-- Invoice items policies
CREATE POLICY "Enable read access for all users" ON invoice_items FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON invoice_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON invoice_items FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON invoice_items FOR DELETE USING (true);
