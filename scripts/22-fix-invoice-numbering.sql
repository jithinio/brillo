-- Fix Invoice Numbering to be Unique Per User
-- This migration changes the invoice_number constraint from globally unique to unique per user

-- Step 0: List all existing get_next_invoice_number functions to see what we're dealing with
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE 'Existing get_next_invoice_number functions:';
    FOR r IN 
        SELECT proname, pg_get_function_identity_arguments(oid) as args 
        FROM pg_proc 
        WHERE proname = 'get_next_invoice_number'
    LOOP
        RAISE NOTICE '  - % (%)', r.proname, r.args;
    END LOOP;
END $$;

-- Step 0.5: Drop ALL existing versions of the function
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 'DROP FUNCTION IF EXISTS ' || proname || '(' || pg_get_function_identity_arguments(oid) || ');' as drop_cmd
        FROM pg_proc 
        WHERE proname = 'get_next_invoice_number'
    LOOP
        EXECUTE r.drop_cmd;
        RAISE NOTICE 'Dropped: %', r.drop_cmd;
    END LOOP;
END $$;

-- Step 1: Drop the existing global unique constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Step 2: Create a composite unique constraint on user_id + invoice_number
-- This allows each user to have their own sequence (001, 002, 003...)
-- First check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'invoices_user_invoice_number_unique'
    ) THEN
        ALTER TABLE invoices ADD CONSTRAINT invoices_user_invoice_number_unique 
          UNIQUE (user_id, invoice_number);
        RAISE NOTICE 'Created constraint invoices_user_invoice_number_unique';
    ELSE
        RAISE NOTICE 'Constraint invoices_user_invoice_number_unique already exists';
    END IF;
END $$;

-- Step 3: Create an invoice_sequences table to track the last number per user per year
CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    year INTEGER NOT NULL,
    last_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, year)
);

-- Enable RLS on the new table
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their own sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can insert their own sequences" ON invoice_sequences;
DROP POLICY IF EXISTS "Users can update their own sequences" ON invoice_sequences;

-- Create policies for invoice_sequences
CREATE POLICY "Users can view their own sequences" ON invoice_sequences
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sequences" ON invoice_sequences
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequences" ON invoice_sequences
FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_invoice_sequences_updated_at ON invoice_sequences;
CREATE TRIGGER update_invoice_sequences_updated_at 
    BEFORE UPDATE ON invoice_sequences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Create function to get next invoice number for a user
CREATE OR REPLACE FUNCTION get_next_invoice_number(
    p_user_id UUID,
    p_prefix TEXT DEFAULT 'INV',
    p_year INTEGER DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
    v_year INTEGER;
    v_next_number INTEGER;
    v_invoice_number TEXT;
BEGIN
    -- Use current year if not provided
    v_year := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
    
    -- Get and increment the sequence in a single atomic operation
    INSERT INTO invoice_sequences (user_id, year, last_number)
    VALUES (p_user_id, v_year, 1)
    ON CONFLICT (user_id, year) DO UPDATE
    SET last_number = invoice_sequences.last_number + 1,
        updated_at = NOW()
    RETURNING last_number INTO v_next_number;
    
    -- Format the invoice number: PREFIX-YEAR-NUMBER (e.g., INV-2024-001)
    v_invoice_number := p_prefix || '-' || v_year || '-' || LPAD(v_next_number::TEXT, 3, '0');
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_sequences_user_year ON invoice_sequences(user_id, year);

-- Step 6: Comment the function
COMMENT ON FUNCTION get_next_invoice_number(UUID, TEXT, INTEGER) IS 'Generates the next sequential invoice number for a user. Each user has their own sequence per year.';

-- Display success message
SELECT 'Invoice numbering migration completed successfully!' as message;
SELECT 'Each user now has their own invoice number sequence (001, 002, 003...) per year.' as note;
SELECT 'Example usage: SELECT get_next_invoice_number(auth.uid(), ''INV'', 2024);' as example; 