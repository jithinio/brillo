-- Complete Supabase Database Setup Script
-- Run this script in your Supabase SQL Editor to set up the entire database

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 3: Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United States',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled')),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2),
    hourly_rate DECIMAL(8,2),
    estimated_hours INTEGER,
    actual_hours INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create invoice_items table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) DEFAULT 1,
    rate DECIMAL(10,2) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    title TEXT,
    bio TEXT,
    location TEXT,
    website TEXT,
    avatar_url TEXT,
    phone TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Create triggers for updated_at columns
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

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 9: Create function to calculate invoice totals
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

-- Step 10: Create triggers for invoice calculations
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

-- Step 11: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- Step 12: Enable Row Level Security (RLS) for all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 13: Create RLS policies for public access (for demo purposes)
-- In production, you would create user-specific policies

-- Clients policies
DROP POLICY IF EXISTS "Enable read access for all users" ON clients;
CREATE POLICY "Enable read access for all users" ON clients FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON clients;
CREATE POLICY "Enable insert for all users" ON clients FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON clients;
CREATE POLICY "Enable update for all users" ON clients FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON clients;
CREATE POLICY "Enable delete for all users" ON clients FOR DELETE USING (true);

-- Projects policies
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
CREATE POLICY "Enable read access for all users" ON projects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON projects;
CREATE POLICY "Enable insert for all users" ON projects FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON projects;
CREATE POLICY "Enable update for all users" ON projects FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON projects;
CREATE POLICY "Enable delete for all users" ON projects FOR DELETE USING (true);

-- Invoices policies
DROP POLICY IF EXISTS "Enable read access for all users" ON invoices;
CREATE POLICY "Enable read access for all users" ON invoices FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON invoices;
CREATE POLICY "Enable insert for all users" ON invoices FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON invoices;
CREATE POLICY "Enable update for all users" ON invoices FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON invoices;
CREATE POLICY "Enable delete for all users" ON invoices FOR DELETE USING (true);

-- Invoice items policies
DROP POLICY IF EXISTS "Enable read access for all users" ON invoice_items;
CREATE POLICY "Enable read access for all users" ON invoice_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for all users" ON invoice_items;
CREATE POLICY "Enable insert for all users" ON invoice_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Enable update for all users" ON invoice_items;
CREATE POLICY "Enable update for all users" ON invoice_items FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Enable delete for all users" ON invoice_items;
CREATE POLICY "Enable delete for all users" ON invoice_items FOR DELETE USING (true);

-- Profiles policies (user-specific)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 14: Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'full_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 16: Set up storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Step 17: Set up storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]); 