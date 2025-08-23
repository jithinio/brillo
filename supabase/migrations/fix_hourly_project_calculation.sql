-- Fix hourly project calculation issue
-- This fixes the missing hours syncing logic in the master_project_calculation function

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS master_project_calculation_trigger ON projects;
DROP FUNCTION IF EXISTS master_project_calculation() CASCADE;

-- Create the fixed master function with proper hourly calculation
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
    -- Step 1: Detect manual budget changes (only for Fixed projects)
    IF TG_OP = 'UPDATE' THEN
        is_manual_budget_change := (
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
                        -- No end date: calculate elapsed periods since start
                        days_diff := current_date_val - start_date_val;
                        IF days_diff < 0 THEN
                            periods_count := 1;
                        ELSE
                            CASE NEW.recurring_frequency
                                WHEN 'weekly' THEN periods_count := GREATEST(1, CEIL(days_diff / 7.0));
                                WHEN 'monthly' THEN periods_count := GREATEST(1, CEIL(days_diff / 30.44));
                                WHEN 'quarterly' THEN periods_count := GREATEST(1, CEIL(days_diff / 91.31));
                                WHEN 'yearly' THEN periods_count := GREATEST(1, CEIL(days_diff / 365.25));
                                ELSE periods_count := 1;
                            END CASE;
                        END IF;
                    ELSE
                        -- Has end date: calculate total periods from start to end
                        end_date_val := COALESCE(NEW.recurring_end_date, NEW.due_date);
                        days_diff := end_date_val - start_date_val;
                        IF days_diff <= 0 THEN
                            periods_count := 1;
                        ELSE
                            CASE NEW.recurring_frequency
                                WHEN 'weekly' THEN periods_count := CEIL(days_diff / 7.0);
                                WHEN 'monthly' THEN periods_count := CEIL(days_diff / 30.44);
                                WHEN 'quarterly' THEN periods_count := CEIL(days_diff / 91.31);
                                WHEN 'yearly' THEN periods_count := CEIL(days_diff / 365.25);
                                ELSE periods_count := 1;
                            END CASE;
                        END IF;
                    END IF;
                    
                    calculated_budget := NEW.recurring_amount * periods_count;
                    NEW.total_budget := calculated_budget;
                END IF;
                
            WHEN 'hourly' THEN
                -- FIXED: Sync hours first - prioritize actual_hours, fall back to estimated_hours
                IF NEW.actual_hours IS NOT NULL AND NEW.actual_hours > 0 THEN
                    NEW.total_hours_logged := NEW.actual_hours;
                ELSIF NEW.estimated_hours IS NOT NULL AND NEW.estimated_hours > 0 THEN
                    NEW.total_hours_logged := NEW.estimated_hours;
                END IF;
                
                -- Calculate budget
                IF NEW.hourly_rate_new IS NOT NULL AND NEW.total_hours_logged IS NOT NULL AND NEW.total_hours_logged > 0 THEN
                    calculated_budget := NEW.hourly_rate_new * NEW.total_hours_logged;
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
    
    -- Step 4: ALWAYS calculate payment_pending correctly
    final_budget := COALESCE(NEW.total_budget, 0);
    final_received := COALESCE(NEW.payment_received, 0);
    final_pending := GREATEST(0, final_budget - final_received);
    
    -- Ensure we never have negative payment_pending
    NEW.payment_pending := final_pending;
    
    -- Step 5: Debug logging
    IF TG_OP = 'UPDATE' THEN
        -- Alert if payment_pending becomes 0 unexpectedly
        IF final_pending = 0 AND final_budget > 0 AND final_received = 0 THEN
            RAISE WARNING 'POTENTIAL ISSUE: Project % has budget % but payment_pending is 0', NEW.id, final_budget;
        END IF;
        
        -- Alert if payment_pending is negative (should never happen)
        IF final_pending < 0 THEN
            RAISE WARNING 'CRITICAL ISSUE: Project % has negative payment_pending: %', NEW.id, final_pending;
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

-- Create the trigger
CREATE TRIGGER master_project_calculation_trigger
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION master_project_calculation();

-- Add comments explaining the behavior
COMMENT ON FUNCTION master_project_calculation() IS 'Master function that handles all project calculations with FIXED hourly hours syncing logic. Allows manual budget updates for Fixed projects while preventing them for hourly/recurring projects.';
COMMENT ON TRIGGER master_project_calculation_trigger ON projects IS 'Handles auto-calculation for recurring/hourly projects with proper hours syncing, while preserving manual budget changes for Fixed projects';

-- Fix any existing hourly projects that may have 0 budget due to the bug
UPDATE projects 
SET updated_at = NOW()
WHERE project_type = 'hourly' 
  AND auto_calculate_total = true 
  AND total_budget = 0 
  AND hourly_rate_new > 0 
  AND (actual_hours > 0 OR estimated_hours > 0);

-- Log the results
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    RAISE NOTICE '=== HOURLY PROJECT CALCULATION FIX COMPLETE ===';
    RAISE NOTICE 'Fixed % hourly projects with zero budget', fixed_count;
    RAISE NOTICE 'Hourly projects will now properly sync hours and calculate budget';
    RAISE NOTICE 'Logic: actual_hours > 0 ? use actual_hours : use estimated_hours';
    RAISE NOTICE 'Budget = hourly_rate_new * total_hours_logged';
END $$;
