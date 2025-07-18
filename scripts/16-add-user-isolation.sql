-- Migration to Add User Isolation to All Tables
-- This script adds user_id columns and proper RLS policies to ensure data privacy

-- Step 1: Add user_id columns to all main tables
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create indexes for user_id columns for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_user_id ON invoice_items(user_id);

-- Step 3: Drop existing public policies
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
DROP POLICY IF EXISTS "Enable insert for all users" ON clients;
DROP POLICY IF EXISTS "Enable update for all users" ON clients;
DROP POLICY IF EXISTS "Enable delete for all users" ON clients;

DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for all users" ON projects;
DROP POLICY IF EXISTS "Enable update for all users" ON projects;
DROP POLICY IF EXISTS "Enable delete for all users" ON projects;

DROP POLICY IF EXISTS "Enable read access for all users" ON invoices;
DROP POLICY IF EXISTS "Enable insert for all users" ON invoices;
DROP POLICY IF EXISTS "Enable update for all users" ON invoices;
DROP POLICY IF EXISTS "Enable delete for all users" ON invoices;

DROP POLICY IF EXISTS "Enable read access for all users" ON invoice_items;
DROP POLICY IF EXISTS "Enable insert for all users" ON invoice_items;
DROP POLICY IF EXISTS "Enable update for all users" ON invoice_items;
DROP POLICY IF EXISTS "Enable delete for all users" ON invoice_items;

-- Step 4: Create user-specific RLS policies

-- Clients policies
CREATE POLICY "Users can view their own clients" ON clients
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" ON clients
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
FOR DELETE USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "Users can view their own projects" ON projects
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects" ON projects
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" ON projects
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" ON projects
FOR DELETE USING (auth.uid() = user_id);

-- Invoices policies
CREATE POLICY "Users can view their own invoices" ON invoices
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON invoices
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON invoices
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON invoices
FOR DELETE USING (auth.uid() = user_id);

-- Invoice items policies
CREATE POLICY "Users can view their own invoice items" ON invoice_items
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoice items" ON invoice_items
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice items" ON invoice_items
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoice items" ON invoice_items
FOR DELETE USING (auth.uid() = user_id);

-- Step 5: Create function to automatically set user_id on inserts
CREATE OR REPLACE FUNCTION auto_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create triggers to automatically set user_id
CREATE TRIGGER auto_set_user_id_clients
    BEFORE INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_set_user_id_projects
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_set_user_id_invoices
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_id();

CREATE TRIGGER auto_set_user_id_invoice_items
    BEFORE INSERT ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_user_id();

-- Step 7: For existing data, you may need to assign user_id values
-- WARNING: This is just an example - you should modify this based on your needs
-- UPDATE clients SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE projects SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE invoices SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;
-- UPDATE invoice_items SET user_id = (SELECT id FROM auth.users LIMIT 1) WHERE user_id IS NULL;

-- Step 8: Make user_id NOT NULL after data migration (uncomment after Step 7)
-- ALTER TABLE clients ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
-- ALTER TABLE invoice_items ALTER COLUMN user_id SET NOT NULL;

-- Display success message
SELECT 'User isolation migration completed successfully!' as message; 