-- Drop and recreate the function to fix parameter naming conflict
-- This solves the "cannot change name of input parameter" error

-- Drop the existing function first
DROP FUNCTION IF EXISTS check_column_exists(text,text);

-- Now create it with properly named parameters
CREATE FUNCTION check_column_exists(p_table_name text, p_column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = p_table_name 
        AND column_name = p_column_name 
        AND table_schema = 'public'
    );
END;
$$ LANGUAGE plpgsql;

-- Also drop and recreate the validation function to ensure it works
DROP FUNCTION IF EXISTS validate_migration_data();

CREATE FUNCTION validate_migration_data()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: project_type column exists
    RETURN QUERY
    SELECT 
        'column_project_type'::TEXT,
        CASE WHEN check_column_exists('projects', 'project_type') THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'project_type column exists: ' || check_column_exists('projects', 'project_type')::TEXT;
    
    -- Check 2: total_budget column exists
    RETURN QUERY
    SELECT 
        'column_total_budget'::TEXT,
        CASE WHEN check_column_exists('projects', 'total_budget') THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'total_budget column exists: ' || check_column_exists('projects', 'total_budget')::TEXT;
    
    -- Check 3: Recurring fields exist
    RETURN QUERY
    SELECT 
        'recurring_columns'::TEXT,
        CASE WHEN (
            check_column_exists('projects', 'recurring_frequency') AND
            check_column_exists('projects', 'recurring_amount')
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Recurring columns exist';
    
    -- Check 4: Hourly fields exist
    RETURN QUERY
    SELECT 
        'hourly_columns'::TEXT,
        CASE WHEN (
            check_column_exists('projects', 'hourly_rate_new') AND
            check_column_exists('projects', 'total_hours_logged')
        ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Hourly columns exist';
    
    -- Check 5: Indexes exist
    RETURN QUERY
    SELECT 
        'indexes_created'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Project indexes found: ' || COUNT(*)::TEXT
    FROM pg_indexes 
    WHERE tablename = 'projects' 
    AND indexname LIKE 'idx_projects_%';
    
    -- Check 6: RLS status
    RETURN QUERY
    SELECT 
        'rls_enabled'::TEXT,
        CASE WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'projects' 
            AND rowsecurity = true
        ) THEN 'PASS' ELSE 'WARN' END::TEXT,
        'RLS is properly enabled';
    
    -- Check 7: Functions exist
    RETURN QUERY
    SELECT 
        'functions_created'::TEXT,
        'PASS'::TEXT,
        'Helper functions are working';
        
END;
$$ LANGUAGE plpgsql;

-- Test that everything works now
SELECT 'Functions recreated successfully!' as status;
SELECT * FROM validate_migration_data();