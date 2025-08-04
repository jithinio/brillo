-- Fix Recurring and Hourly Project Calculations
-- This script addresses the core issues with budget calculations for recurring and hourly projects

-- ===============================================
-- PROBLEM FIXES:
-- 1. Recurring projects: Dynamic calculation based on elapsed time for ongoing projects
-- 2. Hourly projects: Sync total_hours_logged with actual_hours/estimated_hours  
-- 3. Both types: Proper pending amount calculations
-- ===============================================

BEGIN;

-- First, let's update the total_hours_logged field to sync with actual/estimated hours
-- This ensures hourly calculations work properly
UPDATE projects 
SET total_hours_logged = COALESCE(actual_hours, estimated_hours, 0)
WHERE project_type = 'hourly' 
  AND (total_hours_logged IS NULL OR total_hours_logged = 0)
  AND (actual_hours > 0 OR estimated_hours > 0);

-- Create improved calculation function for project total budgets
CREATE OR REPLACE FUNCTION calculate_project_total_budget_v2()
RETURNS TRIGGER AS $$
DECLARE
    start_date_val DATE;
    end_date_val DATE;
    periods_count INTEGER;
    calculated_total DECIMAL(12,2);
    years_diff DECIMAL;
    days_diff INTEGER;
    current_date_val DATE := CURRENT_DATE;
    elapsed_periods INTEGER;
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
                
                -- FOR PROJECTS WITHOUT DUE DATE: Calculate based on elapsed time since start
                IF NEW.recurring_end_date IS NULL AND NEW.due_date IS NULL THEN
                    -- Calculate elapsed periods since start date
                    days_diff := current_date_val - start_date_val;
                    
                    -- If project hasn't started yet, set to 1 period minimum
                    IF days_diff < 0 THEN
                        periods_count := 1;
                    ELSE
                        -- Calculate elapsed periods based on frequency
                        CASE NEW.recurring_frequency
                            WHEN 'weekly' THEN 
                                periods_count := GREATEST(1, CEIL(days_diff / 7.0));
                            WHEN 'monthly' THEN 
                                periods_count := GREATEST(1, CEIL(days_diff / 30.44));
                            WHEN 'quarterly' THEN 
                                periods_count := GREATEST(1, CEIL(days_diff / 91.31));
                            WHEN 'yearly' THEN 
                                periods_count := GREATEST(1, CEIL(days_diff / 365.25));
                            ELSE 
                                periods_count := 1;
                        END CASE;
                    END IF;
                ELSE
                    -- FOR PROJECTS WITH DUE DATE: Calculate total periods from start to end
                    end_date_val := COALESCE(NEW.recurring_end_date, NEW.due_date);
                    days_diff := end_date_val - start_date_val;
                    
                    -- Ensure we have at least 1 period
                    IF days_diff <= 0 THEN
                        periods_count := 1;
                    ELSE
                        -- Calculate total periods based on frequency
                        CASE NEW.recurring_frequency
                            WHEN 'weekly' THEN 
                                periods_count := CEIL(days_diff / 7.0);
                            WHEN 'monthly' THEN 
                                periods_count := CEIL(days_diff / 30.44);
                            WHEN 'quarterly' THEN 
                                periods_count := CEIL(days_diff / 91.31);
                            WHEN 'yearly' THEN 
                                periods_count := CEIL(days_diff / 365.25);
                            ELSE 
                                periods_count := 1;
                        END CASE;
                    END IF;
                END IF;
                
                calculated_total := NEW.recurring_amount * periods_count;
                NEW.total_budget := calculated_total;
                NEW.last_recurring_calculation := NOW();
            END IF;
            
        WHEN 'hourly' THEN
            -- Calculate total budget based on hourly rate and logged hours
            -- Sync total_hours_logged with actual_hours or estimated_hours
            IF NEW.actual_hours IS NOT NULL AND NEW.actual_hours > 0 THEN
                NEW.total_hours_logged := NEW.actual_hours;
            ELSIF NEW.estimated_hours IS NOT NULL AND NEW.estimated_hours > 0 THEN
                NEW.total_hours_logged := NEW.estimated_hours;
            END IF;
            
            -- Calculate total budget
            IF NEW.hourly_rate_new IS NOT NULL AND NEW.total_hours_logged IS NOT NULL AND NEW.total_hours_logged > 0 THEN
                calculated_total := NEW.hourly_rate_new * NEW.total_hours_logged;
                NEW.total_budget := calculated_total;
            END IF;
    END CASE;
    
    -- Update payment_pending calculation to use total_budget for new project types
    IF NEW.project_type IN ('recurring', 'hourly') THEN
        NEW.payment_pending := COALESCE(NEW.total_budget, 0) - COALESCE(NEW.payment_received, 0);
    ELSE
        -- For fixed projects, use budget field
        NEW.payment_pending := COALESCE(NEW.budget, 0) - COALESCE(NEW.payment_received, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace the existing trigger with the improved version
DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget ON projects;
DROP TRIGGER IF EXISTS trigger_calculate_project_total_budget_v2 ON projects;

CREATE TRIGGER trigger_calculate_project_total_budget_v2
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION calculate_project_total_budget_v2();

-- Create a function to batch update all recurring projects (for maintenance)
CREATE OR REPLACE FUNCTION update_all_recurring_projects()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    project_record RECORD;
BEGIN
    -- Update all recurring projects with auto_calculate_total enabled
    FOR project_record IN 
        SELECT id FROM projects 
        WHERE project_type = 'recurring' 
        AND auto_calculate_total = true
        AND recurring_amount IS NOT NULL 
        AND recurring_frequency IS NOT NULL
    LOOP
        -- Trigger recalculation by updating updated_at
        UPDATE projects 
        SET updated_at = NOW()
        WHERE id = project_record.id;
        
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON FUNCTION calculate_project_total_budget_v2() IS 'Enhanced calculation function that properly handles recurring projects without due dates and syncs hourly project hours';
COMMENT ON FUNCTION update_all_recurring_projects() IS 'Utility function to batch update all recurring projects - useful for maintenance';

-- Update existing projects to fix any calculation issues
-- Force recalculation for all auto-calculated projects
UPDATE projects 
SET updated_at = NOW()
WHERE auto_calculate_total = true 
  AND project_type IN ('recurring', 'hourly');

COMMIT;

-- Display summary of what was fixed
DO $$
DECLARE
    recurring_count INTEGER;
    hourly_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO recurring_count FROM projects WHERE project_type = 'recurring' AND auto_calculate_total = true;
    SELECT COUNT(*) INTO hourly_count FROM projects WHERE project_type = 'hourly' AND auto_calculate_total = true;
    
    RAISE NOTICE 'Budget calculation fixes applied successfully:';
    RAISE NOTICE '- % recurring projects will now calculate dynamically', recurring_count;
    RAISE NOTICE '- % hourly projects will now sync hours properly', hourly_count;
    RAISE NOTICE '- Pending amounts will now use total_budget for new project types';
END $$;