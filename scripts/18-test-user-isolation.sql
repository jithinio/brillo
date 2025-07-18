-- Test User Isolation Script
-- Run this to verify that user isolation is working correctly

-- Step 1: Check if user_id columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('clients', 'projects', 'invoices', 'invoice_items')
    AND column_name = 'user_id'
ORDER BY table_name;

-- Step 2: Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('clients', 'projects', 'invoices', 'invoice_items');

-- Step 3: Check user-specific policies exist
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
    AND tablename IN ('clients', 'projects', 'invoices', 'invoice_items')
ORDER BY tablename, policyname;

-- Step 4: Check triggers for auto-setting user_id
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema,
    event_object_schema
FROM information_schema.triggers
WHERE trigger_name LIKE '%auto_set_user_id%'
ORDER BY event_object_table;

-- Step 5: Test with current user (if logged in)
-- This will show only data belonging to the current user
SELECT 'Current user ID: ' || COALESCE(auth.uid()::text, 'Not authenticated') as user_info;

-- Count records per table for current user
SELECT 
    'clients' as table_name,
    COUNT(*) as records_for_current_user
FROM clients
WHERE user_id = auth.uid()

UNION ALL

SELECT 
    'projects' as table_name,
    COUNT(*) as records_for_current_user
FROM projects
WHERE user_id = auth.uid()

UNION ALL

SELECT 
    'invoices' as table_name,
    COUNT(*) as records_for_current_user
FROM invoices
WHERE user_id = auth.uid()

UNION ALL

SELECT 
    'invoice_items' as table_name,
    COUNT(*) as records_for_current_user
FROM invoice_items
WHERE user_id = auth.uid();

-- Step 6: Show sample of data (only what current user can see)
SELECT 'Sample clients visible to current user:' as info;
SELECT id, name, company, user_id FROM clients LIMIT 3;

SELECT 'Sample projects visible to current user:' as info;
SELECT id, name, status, user_id FROM projects LIMIT 3;

SELECT 'If you see data here and user_id matches your auth.uid(), isolation is working!' as conclusion; 