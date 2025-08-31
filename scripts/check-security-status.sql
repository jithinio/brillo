-- Quick security status check
-- Run this after applying the unrestricted tables fix

-- 1. Check current user context
SELECT 'Current user:' as info, auth.uid() as user_id, auth.role() as role;

-- 2. Run security audit to see remaining issues
SELECT 'Tables that still need attention:' as info;
SELECT * FROM security_audit;

-- 3. Check specific tables from your screenshot
SELECT 'Checking specific table security status:' as info;

-- Check if these tables have RLS enabled
SELECT 
  'migration_log' as table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'migration_log') as rls_enabled;

SELECT 
  'project_metrics_summary' as table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'project_metrics_summary') as rls_enabled;

SELECT 
  'pipeline_stages' as table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'pipeline_stages') as rls_enabled;

SELECT 
  'user_usage' as table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'user_usage') as rls_enabled;

-- 4. Test views access (should only return your data)
SELECT 'Testing view access:' as info;

SELECT 'subscription_history count:' as view_name, count(*) as records 
FROM subscription_history;

SELECT 'upcoming_recurring_reminders count:' as view_name, count(*) as records 
FROM upcoming_recurring_reminders;

-- 5. Check for any policies that might be missing
SELECT 'Checking policies:' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Security check completed!' as result;
