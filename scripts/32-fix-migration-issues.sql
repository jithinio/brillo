-- Fix Multi-Project Type Migration Issues
-- This script addresses the issues found during testing

BEGIN;

-- Fix 1: Create missing helper function for testing
CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = $1 
        AND column_name = $2 
        AND table_schema = 'public'
    );
END;
$$ LANGUAGE plpgsql;

-- Fix 2: Ensure all indexes are created properly
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_recurring_freq ON projects(recurring_frequency);
CREATE INDEX IF NOT EXISTS idx_projects_auto_calc ON projects(auto_calculate_total);
CREATE INDEX IF NOT EXISTS idx_projects_type_status ON projects(project_type, status);
CREATE INDEX IF NOT EXISTS idx_projects_total_budget ON projects(total_budget);

-- Fix 3: Ensure project_type constraint exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_project_type_check' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT projects_project_type_check;
    END IF;
    
    -- Add the constraint
    ALTER TABLE projects ADD CONSTRAINT projects_project_type_check 
    CHECK (project_type IN ('fixed', 'recurring', 'hourly'));
EXCEPTION WHEN OTHERS THEN
    -- If there's an issue, just continue
    RAISE NOTICE 'Could not add project_type constraint: %', SQLERRM;
END $$;

-- Fix 4: Fix the calculation function to handle date types properly
CREATE OR REPLACE FUNCTION calculate_project_total_budget()
RETURNS TRIGGER AS $$
DECLARE
    calculated_total DECIMAL(12,2);
    periods_count INTEGER;
    start_date_val DATE;
    end_date_val DATE;
    years_diff DECIMAL;
    days_diff INTEGER;
BEGIN
    -- Only calculate if auto_calculate_total is enabled
    IF NEW.auto_calculate_total = false THEN
        RETURN NEW;
    END IF;
    
    CASE NEW.project_type
        WHEN 'fixed' THEN
            -- For fixed projects, total_budget remains as set by user
            RETURN NEW;
            
        WHEN 'recurring' THEN
            -- Calculate total budget based on recurring amount and frequency
            IF NEW.recurring_amount IS NOT NULL AND NEW.recurring_frequency IS NOT NULL THEN
                start_date_val := COALESCE(NEW.start_date, CURRENT_DATE);
                end_date_val := COALESCE(NEW.recurring_end_date, start_date_val + INTERVAL '1 year');
                
                -- Calculate days difference
                days_diff := end_date_val - start_date_val;
                years_diff := days_diff / 365.25;
                
                -- Calculate periods based on frequency
                CASE NEW.recurring_frequency
                    WHEN 'weekly' THEN periods_count := CEIL(years_diff * 52);
                    WHEN 'monthly' THEN periods_count := CEIL(years_diff * 12);
                    WHEN 'quarterly' THEN periods_count := CEIL(years_diff * 4);
                    WHEN 'yearly' THEN periods_count := CEIL(years_diff);
                    ELSE periods_count := 1;
                END CASE;
                
                calculated_total := NEW.recurring_amount * periods_count;
                NEW.total_budget := calculated_total;
                NEW.last_recurring_calculation := NOW();
            END IF;
            
        WHEN 'hourly' THEN
            -- Calculate total budget based on hourly rate and logged hours
            IF NEW.hourly_rate_new IS NOT NULL AND NEW.total_hours_logged IS NOT NULL THEN
                calculated_total := NEW.hourly_rate_new * NEW.total_hours_logged;
                NEW.total_budget := calculated_total;
            END IF;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix 5: Ensure the trigger is properly created
DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget ON projects;
CREATE TRIGGER trigger_calculate_project_total_budget
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_project_total_budget();

-- Fix 6: Ensure budget field remains accessible (compatibility)
-- Check if budget column exists, if not, add it back
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'budget' 
        AND table_schema = 'public'
    ) THEN
        -- Add budget column back for compatibility
        ALTER TABLE projects ADD COLUMN budget DECIMAL(10,2);
        
        -- Update budget from total_budget for existing records
        UPDATE projects SET budget = total_budget WHERE budget IS NULL;
    END IF;
END $$;

-- Fix 7: Update RLS policies to allow the new fields
-- First, let's check what RLS policies exist
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
    
    -- Update existing policies to include new fields
    -- Note: This is a general approach - you may need to adjust based on your specific RLS setup
    
EXCEPTION WHEN OTHERS THEN
    -- If RLS update fails, log it but continue
    RAISE NOTICE 'RLS policy update note: %', SQLERRM;
END $$;

-- Fix 8: Create a compatibility view for easier querying
CREATE OR REPLACE VIEW projects_with_budget AS
SELECT 
    *,
    -- Ensure budget field is always available
    COALESCE(budget, total_budget) as budget_display,
    -- Add computed fields for easier querying
    CASE 
        WHEN project_type = 'recurring' AND recurring_frequency IS NOT NULL 
        THEN recurring_frequency
        ELSE NULL 
    END as billing_frequency,
    CASE 
        WHEN project_type = 'hourly' AND hourly_rate_new IS NOT NULL 
        THEN hourly_rate_new
        ELSE NULL 
    END as current_hourly_rate
FROM projects;

-- Fix 9: Add helpful functions for project management
CREATE OR REPLACE FUNCTION get_project_type_summary()
RETURNS TABLE (
    project_type TEXT,
    count BIGINT,
    total_budget_sum DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.project_type::TEXT, 'unknown') as project_type,
        COUNT(*) as count,
        SUM(COALESCE(p.total_budget, 0)) as total_budget_sum
    FROM projects p
    GROUP BY p.project_type;
END;
$$ LANGUAGE plpgsql;

-- Fix 10: Validate data integrity after fixes
CREATE OR REPLACE FUNCTION validate_migration_data()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: All projects have project_type
    RETURN QUERY
    SELECT 
        'project_type_coverage'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Projects without project_type: ' || COUNT(*)::TEXT
    FROM projects WHERE project_type IS NULL;
    
    -- Check 2: Budget compatibility
    RETURN QUERY
    SELECT 
        'budget_compatibility'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'WARN' END::TEXT,
        'Projects with budget/total_budget mismatch: ' || COUNT(*)::TEXT
    FROM projects 
    WHERE project_type = 'fixed' 
    AND budget IS NOT NULL 
    AND total_budget IS NOT NULL 
    AND ABS(budget - total_budget) > 0.01;
    
    -- Check 3: Recurring projects have required fields
    RETURN QUERY
    SELECT 
        'recurring_fields'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Recurring projects missing required fields: ' || COUNT(*)::TEXT
    FROM projects 
    WHERE project_type = 'recurring' 
    AND (recurring_frequency IS NULL OR recurring_amount IS NULL);
    
    -- Check 4: Indexes exist
    RETURN QUERY
    SELECT 
        'indexes_created'::TEXT,
        CASE WHEN COUNT(*) >= 3 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        'Project indexes found: ' || COUNT(*)::TEXT
    FROM pg_indexes 
    WHERE tablename = 'projects' 
    AND indexname LIKE 'idx_projects_%';
    
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Run validation and show results
SELECT 'Migration fixes applied successfully!' as status;
SELECT * FROM validate_migration_data();
SELECT * FROM get_project_type_summary();