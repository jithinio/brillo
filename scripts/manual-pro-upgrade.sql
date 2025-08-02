-- Manual Pro Upgrade - Run this in Supabase SQL Editor
-- Since Polar confirmed you have a subscription, update your app status

-- Step 1: Check current status
SELECT 
  id,
  email,
  subscription_plan_id,
  subscription_status,
  subscription_current_period_end,
  polar_customer_id,
  polar_subscription_id
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Update to Pro status (replace the email with your actual email)
UPDATE profiles 
SET 
  subscription_plan_id = 'pro_monthly',
  subscription_status = 'active',
  subscription_current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE email = 'your-email@example.com'; -- ⚠️ REPLACE WITH YOUR ACTUAL EMAIL

-- Step 3: Verify the update worked
SELECT 
  email,
  subscription_plan_id,
  subscription_status,
  subscription_current_period_end,
  updated_at
FROM profiles 
WHERE email = 'your-email@example.com' -- ⚠️ REPLACE WITH YOUR ACTUAL EMAIL
ORDER BY updated_at DESC;

-- If you don't know your email, find your profile by looking at recent records:
-- SELECT email, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;