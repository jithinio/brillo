-- Subscription system database schema
-- This migration is OPTIONAL and can be run when ready to enable subscriptions
-- Existing functionality will continue to work without these tables

-- ===============================================
-- IMPORTANT SAFETY NOTES:
-- 1. This migration is completely optional
-- 2. Run only when ready to enable subscriptions
-- 3. All columns have safe defaults
-- 4. Existing app functionality is unaffected
-- ===============================================

-- Add subscription columns to existing profiles table
-- These columns have safe defaults and won't break existing functionality
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_plan_id VARCHAR(50) DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_current_period_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS polar_customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS polar_subscription_id VARCHAR(100);

-- Create index for faster subscription queries (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
ON profiles(subscription_status);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan 
ON profiles(subscription_plan_id);

-- Usage tracking table (completely optional)
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  projects_count INTEGER DEFAULT 0,
  clients_count INTEGER DEFAULT 0,
  invoices_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Create indexes for usage tracking
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id 
ON user_usage(user_id);

-- Subscription events log for audit trail (optional)
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'subscribed', 'upgraded', 'cancelled', etc.
  from_plan_id VARCHAR(50),
  to_plan_id VARCHAR(50),
  polar_subscription_id VARCHAR(100),
  polar_customer_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id 
ON subscription_events(user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type 
ON subscription_events(event_type);

CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at 
ON subscription_events(created_at DESC);

-- Function to safely update user usage (optional)
CREATE OR REPLACE FUNCTION update_user_usage(
  p_user_id UUID,
  p_projects_count INTEGER DEFAULT NULL,
  p_clients_count INTEGER DEFAULT NULL,
  p_invoices_count INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage (user_id, projects_count, clients_count, invoices_count, last_updated)
  VALUES (
    p_user_id, 
    COALESCE(p_projects_count, 0),
    COALESCE(p_clients_count, 0),
    COALESCE(p_invoices_count, 0),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    projects_count = COALESCE(p_projects_count, user_usage.projects_count),
    clients_count = COALESCE(p_clients_count, user_usage.clients_count),
    invoices_count = COALESCE(p_invoices_count, user_usage.invoices_count),
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to log subscription events (optional)
CREATE OR REPLACE FUNCTION log_subscription_event(
  p_user_id UUID,
  p_event_type VARCHAR(50),
  p_from_plan_id VARCHAR(50) DEFAULT NULL,
  p_to_plan_id VARCHAR(50) DEFAULT NULL,
  p_polar_subscription_id VARCHAR(100) DEFAULT NULL,
  p_polar_customer_id VARCHAR(100) DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO subscription_events (
    user_id, event_type, from_plan_id, to_plan_id, 
    polar_subscription_id, polar_customer_id, metadata
  )
  VALUES (
    p_user_id, p_event_type, p_from_plan_id, p_to_plan_id,
    p_polar_subscription_id, p_polar_customer_id, p_metadata
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) for subscription data
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage data
CREATE POLICY "Users can view own usage" ON user_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own subscription events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions for authenticated users
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_usage TO authenticated;
GRANT SELECT ON subscription_events TO authenticated;

-- Admin/service role permissions (for backend operations)
GRANT ALL ON user_usage TO service_role;
GRANT ALL ON subscription_events TO service_role;

-- ===============================================
-- POST-MIGRATION NOTES:
-- 1. All existing users will have subscription_status = 'free'
-- 2. All existing functionality continues to work
-- 3. Enable feature flags when ready to activate subscriptions
-- 4. No immediate user impact - changes are backend-only
-- ===============================================