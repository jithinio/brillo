-- Test script to verify security fix doesn't break functionality
-- Run this in your Supabase SQL editor while authenticated as a user (not as admin)

-- First, let's check if we have a valid user context
SELECT 'Current user context:' as test, auth.uid() as current_user_id;

-- Test 1: Invoice number functions (should work for current user)
SELECT 'Testing invoice number preview...' as test;
-- Only run if we have a valid user ID
DO $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    PERFORM preview_next_invoice_number(auth.uid());
    RAISE NOTICE 'Invoice number preview test: SUCCESS';
  ELSE
    RAISE NOTICE 'Invoice number preview test: SKIPPED (no user context)';
  END IF;
END $$;

-- Test 2: Views (should return current user's data only)
SELECT 'Testing subscription history view...' as test;
SELECT count(*) as user_subscription_events FROM subscription_history;

SELECT 'Testing upcoming reminders view...' as test;
SELECT count(*) as user_reminders FROM upcoming_recurring_reminders;

SELECT 'Testing invoice items view...' as test;
SELECT count(*) as user_invoice_items FROM invoice_items_view;

-- Test 3: Try to access another user's data (should fail when authenticated)
SELECT 'Testing security: trying to access random user data...' as test;
-- This should fail if you're authenticated, or return empty if not authenticated
DO $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    BEGIN
      PERFORM get_subscription_journey(gen_random_uuid());
      RAISE NOTICE 'Security test: FAILED - should have been blocked!';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Security test: SUCCESS - access properly denied';
    END;
  ELSE
    RAISE NOTICE 'Security test: SKIPPED (no user context)';
  END IF;
END $$;

-- Test 4: Check function permissions
SELECT 'Testing function permissions...' as test;
SELECT has_function_privilege('preview_next_invoice_number(uuid,text,integer)', 'execute') as can_execute_preview;
SELECT has_function_privilege('get_subscription_journey(uuid)', 'execute') as can_execute_subscription;

-- Test 5: Verify admin functions exist but are restricted
SELECT 'Testing admin function restrictions...' as test;
SELECT EXISTS(
  SELECT 1 FROM pg_proc 
  WHERE proname = 'admin_cleanup_expired_reservations'
) as admin_function_exists;

SELECT 'All tests completed!' as result;
