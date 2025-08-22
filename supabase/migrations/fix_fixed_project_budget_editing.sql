-- Fix for Fixed Project Budget Editing Issue
-- Problem: Database trigger prevents manual total_budget updates for Fixed projects
-- Solution: Allow manual updates while preserving auto-calculation protection

-- Create improved master function that distinguishes between manual and automatic updates
CREATE OR REPLACE FUNCTION master_project_calculation()
RETURNS TRIGGER AS $$
DECLARE
    calculated_budget DECIMAL(12,2);
    final_budget DECIMAL(12,2);
    final_received DECIMAL(12,2);
    final_pending DECIMAL(12,2);
    should_recalc_budget BOOLEAN := false;
    is_manual_budget_change BOOLEAN := false;
    
    -- For recurring calculations
    start_date_val DATE;
    end_date_val DATE;
    periods_count INTEGER;
    days_diff INTEGER;
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- Step 1: Determine if this is a manual budget change
    IF TG_OP = 'UPDATE' THEN
        is_manual_budget_change := (
            OLD.total_budget IS DISTINCT FROM NEW.total_budget AND
            -- Only allow manual budget changes for Fixed projects
            NEW.project_type = 'fixed' AND
            -- Only consider it manual if other auto-calculation fields haven't changed
            OLD.recurring_amount IS NOT DISTINCT FROM NEW.recurring_amount AND
            OLD.recurring_frequency IS NOT DISTINCT FROM NEW.recurring_frequency AND
            OLD.hourly_rate_new IS NOT DISTINCT FROM NEW.hourly_rate_new AND
            OLD.actual_hours IS NOT DISTINCT FROM NEW.actual_hours AND
            OLD.estimated_hours IS NOT DISTINCT FROM NEW.estimated_hours
        );
    END IF;

    -- Step 2: Determine if we need to recalculate total_budget (only for automatic changes)
    IF TG_OP = 'INSERT' THEN
        should_recalc_budget := (NEW.auto_calculate_total = true AND NEW.project_type != 'fixed');
    ELSIF TG_OP = 'UPDATE' AND NOT is_manual_budget_change THEN
        -- Only recalculate budget for specific changes, NOT date-only changes for hourly/fixed
        CASE NEW.project_type
            WHEN 'fixed' THEN
                -- Fixed projects: NEVER auto-recalculate total_budget
                should_recalc_budget := false;
                
            WHEN 'hourly' THEN
                -- Hourly: Only recalculate if hourly-specific fields changed
                should_recalc_budget := (
                    NEW.auto_calculate_total = true AND (
                        OLD.hourly_rate_new IS DISTINCT FROM NEW.hourly_rate_new OR
                        OLD.actual_hours IS DISTINCT FROM NEW.actual_hours OR
                        OLD.estimated_hours IS DISTINCT FROM NEW.estimated_hours
                    )
                );
                
            WHEN 'recurring' THEN
                -- Recurring: Recalculate if recurring fields OR dates changed (dates matter for recurring)
                should_recalc_budget := (
                    NEW.auto_calculate_total = true AND (
                        OLD.recurring_amount IS DISTINCT FROM NEW.recurring_amount OR
                        OLD.recurring_frequency IS DISTINCT FROM NEW.recurring_frequency OR
                        OLD.start_date IS DISTINCT FROM NEW.start_date OR
                        OLD.due_date IS DISTINCT FROM NEW.due_date OR
                        OLD.recurring_end_date IS DISTINCT FROM NEW.recurring_end_date
                    )
                );
                
            ELSE
                -- Unknown project types: don't auto-recalculate
                should_recalc_budget := false;
        END CASE;
    END IF;
    
    -- Step 3: Handle total_budget calculation
    IF should_recalc_budget THEN
        CASE NEW.project_type
            WHEN 'recurring' THEN
                IF NEW.recurring_amount IS NOT NULL AND NEW.recurring_frequency IS NOT NULL THEN
                    start_date_val := COALESCE(NEW.start_date, CURRENT_DATE);
                    
                    -- Calculate based on whether there's an end date
                    IF NEW.recurring_end_date IS NULL AND NEW.due_date IS NULL THEN
                        -- No end date: assume 12 months from start for calculation
                        end_date_val := start_date_val + INTERVAL '12 months';
                    ELSE
                        -- Use whichever end date is provided (recurring_end_date takes precedence)
                        end_date_val := COALESCE(NEW.recurring_end_date, NEW.due_date);
                    END IF;
                    
                    -- Calculate number of days between start and end
                    days_diff := (end_date_val - start_date_val);
                    
                    -- Calculate periods based on frequency
                    CASE NEW.recurring_frequency
                        WHEN 'daily' THEN
                            periods_count := days_diff;
                        WHEN 'weekly' THEN
                            periods_count := CEIL(days_diff / 7.0);
                        WHEN 'biweekly' THEN
                            periods_count := CEIL(days_diff / 14.0);
                        WHEN 'monthly' THEN
                            periods_count := CEIL(days_diff / 30.44); -- Average days per month
                        WHEN 'quarterly' THEN
                            periods_count := CEIL(days_diff / 91.31); -- Average days per quarter  
                        WHEN 'yearly' THEN
                            periods_count := CEIL(days_diff / 365.25); -- Average days per year
                        ELSE
                            periods_count := 1; -- Default fallback
                    END CASE;
                    
                    -- Ensure at least 1 period
                    periods_count := GREATEST(1, periods_count);
                    
                    calculated_budget := NEW.recurring_amount * periods_count;
                    NEW.total_budget := calculated_budget;
                END IF;
                
            WHEN 'hourly' THEN
                IF NEW.hourly_rate_new IS NOT NULL THEN
                    calculated_budget := NEW.hourly_rate_new * COALESCE(NEW.total_hours_logged, 0);
                    NEW.total_budget := calculated_budget;
                END IF;
        END CASE;
        
        RAISE NOTICE 'RECALCULATED: % project % budget: % -> %', 
            NEW.project_type, NEW.id, COALESCE(OLD.total_budget, 0), NEW.total_budget;
    ELSIF TG_OP = 'UPDATE' AND NOT is_manual_budget_change THEN
        -- Preserve existing budget for non-recalculation scenarios (but NOT for manual changes)
        NEW.total_budget := OLD.total_budget;
        RAISE NOTICE 'PRESERVED: % project % budget unchanged at %', 
            NEW.project_type, NEW.id, NEW.total_budget;
    ELSIF is_manual_budget_change THEN
        -- Allow manual budget changes to go through (only for Fixed projects due to the check above)
        RAISE NOTICE 'MANUAL CHANGE: % project % budget: % -> %', 
            NEW.project_type, NEW.id, OLD.total_budget, NEW.total_budget;
    ELSIF TG_OP = 'UPDATE' AND OLD.total_budget IS DISTINCT FROM NEW.total_budget AND NEW.project_type IN ('hourly', 'recurring') THEN
        -- Prevent manual budget changes for hourly and recurring projects
        RAISE EXCEPTION 'Manual budget changes are not allowed for % projects. Budget is calculated automatically.', NEW.project_type;
    END IF;
    
    -- Step 4: ALWAYS calculate payment_pending correctly (this is the most critical part)
    final_budget := COALESCE(NEW.total_budget, 0);
    final_received := COALESCE(NEW.payment_received, 0);
    final_pending := GREATEST(0, final_budget - final_received);
    
    -- Ensure we never have negative payment_pending
    NEW.payment_pending := final_pending;
    
    -- Step 5: Debug logging for all scenarios
    IF TG_OP = 'UPDATE' THEN
        -- Due date changes
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            RAISE NOTICE 'DUE DATE CHANGE: % project % due_date: % -> %', 
                NEW.project_type, NEW.id, OLD.due_date, NEW.due_date;
        END IF;
        
        -- Payment changes
        IF OLD.payment_received IS DISTINCT FROM NEW.payment_received THEN
            RAISE NOTICE 'PAYMENT CHANGE: % project % payment_received: % -> %, payment_pending: % -> %', 
                NEW.project_type, NEW.id, 
                COALESCE(OLD.payment_received, 0), COALESCE(NEW.payment_received, 0),
                COALESCE(OLD.payment_pending, 0), NEW.payment_pending;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the operation
        RAISE WARNING 'Error in master_project_calculation: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create ONE trigger to rule them all
DROP TRIGGER IF EXISTS master_project_calculation_trigger ON projects;
CREATE TRIGGER master_project_calculation_trigger
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION master_project_calculation();

-- Step 4: Add comments explaining the behavior
COMMENT ON FUNCTION master_project_calculation() IS 'Master function that handles all project calculations while allowing manual budget updates for Fixed projects';
COMMENT ON TRIGGER master_project_calculation_trigger ON projects IS 'Handles auto-calculation for recurring/hourly projects while preserving manual budget changes for Fixed projects';

-- Step 5: Test the fix with a sample update (commented out for production)
-- Update this to test with your actual Fixed project ID
/*
-- Test manual budget update on a Fixed project
UPDATE projects 
SET total_budget = 5000 
WHERE project_type = 'fixed' 
AND id = 'your-fixed-project-id-here'
LIMIT 1;

-- Verify the change went through
SELECT id, name, project_type, total_budget, payment_pending 
FROM projects 
WHERE project_type = 'fixed' 
AND id = 'your-fixed-project-id-here';
*/
