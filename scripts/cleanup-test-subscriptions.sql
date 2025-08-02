-- Cleanup Test Subscriptions for Production Launch
-- This script resets all users to free plan and cleans up test subscription data

-- Step 1: Backup current subscription data (optional)
CREATE TABLE IF NOT EXISTS subscription_cleanup_backup AS 
SELECT 
  id,
  subscription_status,
  subscription_plan_id,
  polar_customer_id,
  polar_subscription_id,
  subscription_current_period_start,
  subscription_current_period_end,
  created_at
FROM profiles 
WHERE subscription_status != 'free';

-- Step 2: Reset all users to free plan
UPDATE profiles 
SET 
  subscription_status = 'free',
  subscription_plan_id = 'free',
  polar_customer_id = NULL,
  polar_subscription_id = NULL, 
  subscription_current_period_start = NULL,
  subscription_current_period_end = NULL
WHERE subscription_status != 'free';

-- Step 3: Clear test subscription events
DELETE FROM subscription_events 
WHERE created_at < NOW() - INTERVAL '1 day';

-- Step 4: Reset usage tracking for clean start (optional)
DELETE FROM user_usage 
WHERE created_at < NOW() - INTERVAL '1 hour';

-- Step 5: Verify cleanup
SELECT 
  subscription_status,
  COUNT(*) as user_count
FROM profiles 
GROUP BY subscription_status
ORDER BY subscription_status;

-- Show any remaining subscription data
SELECT 
  id,
  subscription_status,
  subscription_plan_id,
  polar_customer_id,
  polar_subscription_id
FROM profiles 
WHERE subscription_status != 'free' OR polar_subscription_id IS NOT NULL;

-- If the above query returns rows, there's still test data to clean