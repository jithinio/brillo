-- Create subscription_events table for audit trail
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'upgraded', 'downgraded', 'cancelled', 'synced', 'failed'
  from_plan_id VARCHAR(50),
  to_plan_id VARCHAR(50),
  provider VARCHAR(20) DEFAULT 'polar', -- Now only 'polar'
  subscription_id TEXT,
  customer_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_event_type ON subscription_events(event_type);

-- Add RLS policies
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Service role has full access" ON subscription_events;

-- Users can only view their own subscription events
CREATE POLICY "Users can view own subscription events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role has full access" ON subscription_events
  FOR ALL USING (auth.role() = 'service_role');

-- Create a view for subscription history summary
CREATE OR REPLACE VIEW subscription_history AS
SELECT 
  se.user_id,
  se.event_type,
  se.from_plan_id,
  se.to_plan_id,
  se.created_at,
  se.metadata,
  au.email as user_email,
  p.subscription_plan_id as current_plan
FROM subscription_events se
LEFT JOIN auth.users au ON au.id = se.user_id
LEFT JOIN profiles p ON p.id = se.user_id
ORDER BY se.created_at DESC;

-- Grant access to the view
GRANT SELECT ON subscription_history TO authenticated;

-- Function to get subscription journey for a user
CREATE OR REPLACE FUNCTION get_subscription_journey(p_user_id UUID)
RETURNS TABLE (
  event_type VARCHAR(50),
  plan_change TEXT,
  created_at TIMESTAMPTZ,
  days_since_last_event INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH events AS (
    SELECT 
      se.event_type,
      CASE 
        WHEN se.from_plan_id = se.to_plan_id THEN se.to_plan_id
        ELSE COALESCE(se.from_plan_id, 'free') || ' → ' || se.to_plan_id
      END as plan_change,
      se.created_at,
      LAG(se.created_at) OVER (ORDER BY se.created_at) as prev_event_time
    FROM subscription_events se
    WHERE se.user_id = p_user_id
    ORDER BY se.created_at
  )
  SELECT 
    e.event_type,
    e.plan_change,
    e.created_at,
    CASE 
      WHEN e.prev_event_time IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM e.created_at - e.prev_event_time)::INTEGER
    END as days_since_last_event
  FROM events e;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_subscription_journey(UUID) TO authenticated;
