-- Combined migration script for company settings and logo storage
-- Run this script in your Supabase SQL editor

-- Add this at the top of the script
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Create company_settings table
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) DEFAULT 'Your Company',
    company_address TEXT,
    company_email VARCHAR(255),
    company_phone VARCHAR(50),
    company_website VARCHAR(255),
    company_logo TEXT,
    company_registration VARCHAR(100),
    default_currency VARCHAR(10) DEFAULT 'USD',
    tax_rate DECIMAL(5,2) DEFAULT 0,
    tax_name VARCHAR(100) DEFAULT 'Tax',
    include_tax_in_prices BOOLEAN DEFAULT false,
    auto_calculate_tax BOOLEAN DEFAULT true,
    invoice_prefix VARCHAR(20) DEFAULT 'INV',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- 3. Create policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can update their own company settings" ON company_settings;
DROP POLICY IF EXISTS "Users can insert their own company settings" ON company_settings;

CREATE POLICY "Users can view their own company settings" ON company_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" ON company_settings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" ON company_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Create trigger for updated_at (drop existing one first)
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON company_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Create function to handle new user company settings creation
CREATE OR REPLACE FUNCTION public.handle_new_user_company_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.company_settings (user_id, company_name)
    VALUES (NEW.id, 'Your Company');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to create company settings on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_company_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_company_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company_settings();

-- 7. Create index
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id);

-- 8. Create company-assets storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Set up RLS policies for the company-assets bucket (drop existing ones first)
DROP POLICY IF EXISTS "Users can upload their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own company assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;

CREATE POLICY "Users can upload their own company assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can view their own company assets" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can update their own company assets" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

CREATE POLICY "Users can delete their own company assets" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- 10. Allow public access to company assets (for viewing logos in invoices)
CREATE POLICY "Public can view company assets" ON storage.objects
FOR SELECT USING (bucket_id = 'company-assets');

-- Clean up duplicate company_settings records
-- Keep only the most recent record per user

WITH ranked_settings AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM company_settings
)
DELETE FROM company_settings 
WHERE id IN (
  SELECT id FROM ranked_settings WHERE rn > 1
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE company_settings 
ADD CONSTRAINT unique_user_company_settings 
UNIQUE (user_id); 