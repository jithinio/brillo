-- Add quantity_label field to company_settings table
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS quantity_label VARCHAR(50) DEFAULT 'Qty';

-- Add comment for documentation
COMMENT ON COLUMN company_settings.quantity_label IS 'Default quantity label for invoice item tables. Can be Qty, Hours, Days, Units, etc.';

-- Add quantity_label field to invoices table for per-invoice customization
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS quantity_label VARCHAR(50) DEFAULT 'Qty';

-- Add comment for documentation
COMMENT ON COLUMN invoices.quantity_label IS 'Quantity label used for this specific invoice. Can override the default company setting.';

-- Create custom_quantity_labels table for user-specific quantity labels
CREATE TABLE IF NOT EXISTS custom_quantity_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, label)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_custom_quantity_labels_user_id ON custom_quantity_labels(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_quantity_labels_active ON custom_quantity_labels(user_id, is_active);

-- Add RLS policies
ALTER TABLE custom_quantity_labels ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own quantity labels" ON custom_quantity_labels;
DROP POLICY IF EXISTS "Service role has full access to quantity labels" ON custom_quantity_labels;

-- Users can only manage their own quantity labels
CREATE POLICY "Users can manage own quantity labels" ON custom_quantity_labels
  FOR ALL USING (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role has full access to quantity labels" ON custom_quantity_labels
  FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE custom_quantity_labels IS 'User-specific custom quantity labels for invoice customization';
