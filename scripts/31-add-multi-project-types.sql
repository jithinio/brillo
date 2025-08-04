-- Multi-Project Type System Migration (Phase 1)
-- This migration adds support for Fixed, Recurring, and Hourly project types
-- CRITICAL: This migration preserves ALL existing data and functionality

-- ===============================================
-- SAFETY NOTES:
-- 1. All existing projects will remain functional
-- 2. Current budget field is preserved alongside new total_budget field
-- 3. All new fields have safe defaults
-- 4. Backwards compatibility maintained
-- ===============================================

BEGIN;

-- Step 1: Add new project type fields with safe defaults
-- These fields enable the new project type functionality
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS project_type VARCHAR(20) DEFAULT 'fixed' 
    CHECK (project_type IN ('fixed', 'recurring', 'hourly')),
ADD COLUMN IF NOT EXISTS recurring_frequency VARCHAR(20)
    CHECK (recurring_frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS recurring_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS hourly_rate_new DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_hours_logged DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS recurring_end_date DATE,
ADD COLUMN IF NOT EXISTS last_recurring_calculation TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_calculate_total BOOLEAN DEFAULT false;

-- Step 2: Add total_budget field alongside existing budget field
-- This allows gradual migration without breaking existing code
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS total_budget DECIMAL(12,2);

-- Step 3: Initialize total_budget with current budget values
-- This ensures data continuity during the transition
UPDATE projects 
SET total_budget = COALESCE(budget, 0)
WHERE total_budget IS NULL;

-- Step 4: Set all existing projects as 'fixed' type
-- This preserves current behavior for existing projects
UPDATE projects 
SET project_type = 'fixed',
    auto_calculate_total = false
WHERE project_type IS NULL;

-- Step 5: Create performance indexes for new functionality
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_recurring_freq ON projects(recurring_frequency);
CREATE INDEX IF NOT EXISTS idx_projects_auto_calc ON projects(auto_calculate_total);
CREATE INDEX IF NOT EXISTS idx_projects_type_status ON projects(project_type, status);
CREATE INDEX IF NOT EXISTS idx_projects_total_budget ON projects(total_budget);

-- Step 6: Create function for automatic total budget calculation
CREATE OR REPLACE FUNCTION calculate_project_total_budget()
RETURNS TRIGGER AS $$
DECLARE
    calculated_total DECIMAL(12,2);
    periods_count INTEGER;
    start_date_val DATE;
    end_date_val DATE;
    years_diff DECIMAL;
BEGIN
    -- Only calculate if auto_calculate_total is enabled
    IF NEW.auto_calculate_total = false THEN
        RETURN NEW;
    END IF;
    
    CASE NEW.project_type
        WHEN 'fixed' THEN
            -- For fixed projects, total_budget remains as set by user
            -- No automatic calculation needed
            RETURN NEW;
            
        WHEN 'recurring' THEN
            -- Calculate total budget based on recurring amount and frequency
            IF NEW.recurring_amount IS NOT NULL AND NEW.recurring_frequency IS NOT NULL THEN
                start_date_val := COALESCE(NEW.start_date, CURRENT_DATE);
                end_date_val := COALESCE(NEW.recurring_end_date, start_date_val + INTERVAL '1 year');
                
                -- Calculate periods based on frequency
                years_diff := EXTRACT(EPOCH FROM (end_date_val - start_date_val)) / (365.25 * 24 * 60 * 60);
                
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

-- Step 7: Create trigger for automatic calculations
DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget ON projects;
CREATE TRIGGER trigger_calculate_project_total_budget
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_project_total_budget();

-- Step 8: Create helper function for safe project type conversion
CREATE OR REPLACE FUNCTION convert_project_type(
    project_id UUID,
    new_type VARCHAR(20),
    new_recurring_frequency VARCHAR(20) DEFAULT NULL,
    new_recurring_amount DECIMAL(12,2) DEFAULT NULL,
    new_hourly_rate DECIMAL(10,2) DEFAULT NULL,
    enable_auto_calc BOOLEAN DEFAULT true
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validate project type
    IF new_type NOT IN ('fixed', 'recurring', 'hourly') THEN
        RAISE EXCEPTION 'Invalid project type: %', new_type;
    END IF;
    
    -- Update project with new type and settings
    UPDATE projects SET
        project_type = new_type,
        recurring_frequency = new_recurring_frequency,
        recurring_amount = new_recurring_amount,
        hourly_rate_new = new_hourly_rate,
        auto_calculate_total = enable_auto_calc,
        updated_at = NOW()
    WHERE id = project_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN projects.project_type IS 'Type of project: fixed, recurring, or hourly';
COMMENT ON COLUMN projects.recurring_frequency IS 'Frequency for recurring projects: weekly, monthly, quarterly, yearly';
COMMENT ON COLUMN projects.recurring_amount IS 'Amount charged per recurring period';
COMMENT ON COLUMN projects.hourly_rate_new IS 'Hourly rate for hourly projects (separate from legacy hourly_rate)';
COMMENT ON COLUMN projects.total_hours_logged IS 'Total hours logged for hourly projects';
COMMENT ON COLUMN projects.total_budget IS 'Total project budget (auto-calculated for recurring/hourly, manual for fixed)';
COMMENT ON COLUMN projects.recurring_end_date IS 'End date for recurring billing (optional)';
COMMENT ON COLUMN projects.last_recurring_calculation IS 'Last time recurring total was calculated';
COMMENT ON COLUMN projects.auto_calculate_total IS 'Whether to automatically calculate total_budget based on project type';

-- Step 10: Create view for backwards compatibility with budget field
-- This ensures existing queries continue to work during transition period
CREATE OR REPLACE VIEW projects_compatible AS
SELECT 
    *,
    -- Provide budget as alias for total_budget for backwards compatibility
    total_budget as budget_calculated,
    -- Keep original budget field available
    budget as budget_original
FROM projects;

-- Step 11: Update constraint to include pipeline status (if not already present)
DO $$
BEGIN
    -- Check if status constraint exists and update it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_status_check' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT projects_status_check;
    END IF;
    
    -- Add updated constraint
    ALTER TABLE projects ADD CONSTRAINT projects_status_check 
    CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'pipeline'));
EXCEPTION WHEN OTHERS THEN
    -- If constraint doesn't exist or has different name, add it anyway
    ALTER TABLE projects ADD CONSTRAINT projects_status_check 
    CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'pipeline'));
END $$;

-- Step 12: Create data integrity check function
CREATE OR REPLACE FUNCTION validate_project_data()
RETURNS TABLE (
    project_id UUID,
    project_name VARCHAR(255),
    issue_description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        CASE 
            WHEN p.project_type = 'recurring' AND (p.recurring_frequency IS NULL OR p.recurring_amount IS NULL) 
            THEN 'Recurring project missing frequency or amount'
            WHEN p.project_type = 'hourly' AND p.hourly_rate_new IS NULL 
            THEN 'Hourly project missing hourly rate'
            WHEN p.total_budget IS NULL 
            THEN 'Project missing total budget'
            ELSE 'Data integrity check passed'
        END as issue_description
    FROM projects p
    WHERE p.project_type IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Display success message
SELECT 'Multi-project type system migration completed successfully!' as status,
       'All existing data preserved. Ready for Phase 2.' as next_step;

-- Show current project type distribution
SELECT 
    project_type,
    COUNT(*) as project_count,
    SUM(total_budget) as total_value
FROM projects 
GROUP BY project_type
ORDER BY project_count DESC;