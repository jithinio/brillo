-- Create invoice number sequencing system with reservation capabilities
-- This migration adds proper sequential invoice numbering with temporary reservations

-- First, create a table to track reserved invoice numbers
CREATE TABLE IF NOT EXISTS invoice_number_reservations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  prefix text NOT NULL,
  year integer NOT NULL,
  sequence_number integer NOT NULL,
  reserved_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 minutes'),
  session_id text, -- To track browser sessions
  UNIQUE(user_id, invoice_number)
);

-- Add RLS policies for reservations
ALTER TABLE invoice_number_reservations ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists to avoid duplicate errors
DROP POLICY IF EXISTS "Users can manage their own reservations" ON invoice_number_reservations;

CREATE POLICY "Users can manage their own reservations" ON invoice_number_reservations
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_reservations_user_year ON invoice_number_reservations(user_id, year);
CREATE INDEX IF NOT EXISTS idx_invoice_reservations_expires ON invoice_number_reservations(expires_at);

-- Function to clean up expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM invoice_number_reservations 
  WHERE expires_at < now();
END;
$$;

-- Function to get the next available invoice number with reservation
CREATE OR REPLACE FUNCTION get_next_invoice_number(
  p_user_id uuid,
  p_prefix text DEFAULT 'INV',
  p_year integer DEFAULT EXTRACT(year FROM now())::integer,
  p_session_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
  v_invoice_number text;
  v_max_existing integer := 0;
  v_max_reserved integer := 0;
BEGIN
  -- Clean up expired reservations first
  PERFORM cleanup_expired_reservations();
  
  -- Get the highest existing invoice number for this user/prefix/year
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ (p_prefix || '-' || p_year::text || '-(\d+)$') THEN
        (regexp_match(invoice_number, p_prefix || '-' || p_year::text || '-(\d+)$'))[1]::integer
      ELSE 0
    END
  ), 0) INTO v_max_existing
  FROM invoices 
  WHERE user_id = p_user_id 
    AND invoice_number LIKE p_prefix || '-' || p_year::text || '-%';
  
  -- Get the highest reserved number for this user/prefix/year
  SELECT COALESCE(MAX(sequence_number), 0) INTO v_max_reserved
  FROM invoice_number_reservations 
  WHERE user_id = p_user_id 
    AND prefix = p_prefix 
    AND year = p_year
    AND expires_at > now();
  
  -- The next number should be the maximum of existing and reserved + 1
  v_next_number := GREATEST(v_max_existing, v_max_reserved) + 1;
  
  -- Format the invoice number
  v_invoice_number := p_prefix || '-' || p_year::text || '-' || lpad(v_next_number::text, 3, '0');
  
  -- Reserve this number for 30 minutes
  INSERT INTO invoice_number_reservations (
    user_id, 
    invoice_number, 
    prefix, 
    year, 
    sequence_number,
    session_id
  ) VALUES (
    p_user_id, 
    v_invoice_number, 
    p_prefix, 
    p_year, 
    v_next_number,
    p_session_id
  )
  ON CONFLICT (user_id, invoice_number) 
  DO UPDATE SET 
    expires_at = now() + interval '30 minutes',
    session_id = EXCLUDED.session_id;
  
  RETURN v_invoice_number;
END;
$$;

-- Function to preview the next invoice number without reserving it
CREATE OR REPLACE FUNCTION preview_next_invoice_number(
  p_user_id uuid,
  p_prefix text DEFAULT 'INV',
  p_year integer DEFAULT EXTRACT(year FROM now())::integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next_number integer;
  v_invoice_number text;
  v_max_existing integer := 0;
  v_max_reserved integer := 0;
BEGIN
  -- Clean up expired reservations first
  PERFORM cleanup_expired_reservations();
  
  -- Get the highest existing invoice number for this user/prefix/year
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ (p_prefix || '-' || p_year::text || '-(\d+)$') THEN
        (regexp_match(invoice_number, p_prefix || '-' || p_year::text || '-(\d+)$'))[1]::integer
      ELSE 0
    END
  ), 0) INTO v_max_existing
  FROM invoices 
  WHERE user_id = p_user_id 
    AND invoice_number LIKE p_prefix || '-' || p_year::text || '-%';
  
  -- Get the highest reserved number for this user/prefix/year
  SELECT COALESCE(MAX(sequence_number), 0) INTO v_max_reserved
  FROM invoice_number_reservations 
  WHERE user_id = p_user_id 
    AND prefix = p_prefix 
    AND year = p_year
    AND expires_at > now();
  
  -- The next number would be the maximum of existing and reserved + 1
  v_next_number := GREATEST(v_max_existing, v_max_reserved) + 1;
  
  -- Format the invoice number
  v_invoice_number := p_prefix || '-' || p_year::text || '-' || lpad(v_next_number::text, 3, '0');
  
  RETURN v_invoice_number;
END;
$$;

-- Function to cancel a reservation
CREATE OR REPLACE FUNCTION cancel_invoice_number_reservation(
  p_user_id uuid,
  p_invoice_number text DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  IF p_invoice_number IS NOT NULL THEN
    -- Cancel specific reservation
    DELETE FROM invoice_number_reservations 
    WHERE user_id = p_user_id 
      AND invoice_number = p_invoice_number;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  ELSIF p_session_id IS NOT NULL THEN
    -- Cancel all reservations for this session
    DELETE FROM invoice_number_reservations 
    WHERE user_id = p_user_id 
      AND session_id = p_session_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  ELSE
    -- Cancel all reservations for this user (fallback)
    DELETE FROM invoice_number_reservations 
    WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  END IF;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Function to confirm a reservation (convert to actual invoice)
CREATE OR REPLACE FUNCTION confirm_invoice_number_reservation(
  p_user_id uuid,
  p_invoice_number text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Remove the reservation since the invoice is now created
  DELETE FROM invoice_number_reservations 
  WHERE user_id = p_user_id 
    AND invoice_number = p_invoice_number;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count > 0;
END;
$$;

-- Note: Automatic cleanup via cron requires the pg_cron extension
-- If pg_cron is not available, expired reservations will be cleaned up
-- automatically when other functions run (they all call cleanup_expired_reservations())
-- 
-- To enable automatic cleanup with cron (optional):
-- 1. Enable pg_cron extension: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- 2. Uncomment the following line:
-- SELECT cron.schedule('cleanup-invoice-reservations', '0 * * * *', 'SELECT cleanup_expired_reservations();');
