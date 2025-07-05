-- Create company_settings table
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

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own company settings" ON company_settings
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company settings" ON company_settings
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company settings" ON company_settings
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at 
    BEFORE UPDATE ON company_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user company settings creation
CREATE OR REPLACE FUNCTION public.handle_new_user_company_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.company_settings (user_id, company_name)
    VALUES (NEW.id, 'Your Company');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create company settings on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_company_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_company_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_company_settings();

-- Create index
CREATE INDEX IF NOT EXISTS idx_company_settings_user_id ON company_settings(user_id); 