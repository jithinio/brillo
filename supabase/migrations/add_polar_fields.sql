-- Add Polar fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT;

-- Create indexes for Polar IDs
CREATE INDEX IF NOT EXISTS idx_profiles_polar_customer_id ON profiles(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_polar_subscription_id ON profiles(polar_subscription_id);

-- Update RLS policies if needed
-- The existing RLS policies should work fine with the new columns
