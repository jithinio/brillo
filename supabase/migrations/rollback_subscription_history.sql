-- Rollback migration for subscription history
-- Run this if you need to remove the subscription history tables

-- Drop function
DROP FUNCTION IF EXISTS get_subscription_journey(UUID);

-- Drop view
DROP VIEW IF EXISTS subscription_history;

-- Drop policies
DROP POLICY IF EXISTS "Users can view own subscription events" ON subscription_events;
DROP POLICY IF EXISTS "Service role has full access" ON subscription_events;

-- Drop indexes
DROP INDEX IF EXISTS idx_subscription_events_user_id;
DROP INDEX IF EXISTS idx_subscription_events_created_at;
DROP INDEX IF EXISTS idx_subscription_events_event_type;

-- Drop table
DROP TABLE IF EXISTS subscription_events;
