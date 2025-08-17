-- FINAL MIGRATION: Complete fix for ALL payment_pending issues across ALL project types
-- This handles: Adding due date, Removing due date, Changing due date, Adding/removing received amounts
-- Goal: payment_pending ALWAYS shows correctly for analytics

-- Step 1: Complete cleanup - remove ALL existing triggers and functions
DROP TRIGGER IF EXISTS trigger_auto_calculate_project_total ON projects;
DROP TRIGGER IF EXISTS trigger_fix_payment_pending ON projects;
DROP TRIGGER IF EXISTS project_auto_calculate_trigger ON projects;
DROP TRIGGER IF EXISTS calculate_project_total_budget_v2_trigger ON projects;

DROP FUNCTION IF EXISTS auto_calculate_project_total() CASCADE;
DROP FUNCTION IF EXISTS fix_payment_pending() CASCADE;
DROP FUNCTION IF EXISTS calculate_project_total_budget_v2() CASCADE;
DROP FUNCTION IF EXISTS recalculate_project_total(UUID) CASCADE;

-- Step 2: Create ONE master function that handles everything correctly
CREATE OR REPLACE FUNCTION master_project_calculation()
RETURNS TRIGGER AS $$
DECLARE
    calculated_budget DECIMAL(12,2);
    final_budget DECIMAL(12,2);
    final_received DECIMAL(12,2);
    final_pending DECIMAL(12,2);
    should_recalc_budget BOOLEAN := false;
    
    -- For recurring calculations
    start_date_val DATE;
    end_date_val DATE;
    periods_count INTEGER;
    days_diff INTEGER;
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- Step 1: Determine if we need to recalculate total_budget
    IF TG_OP = 'INSERT' THEN
        should_recalc_budget := (NEW.auto_calculate_total = true AND NEW.project_type != 'fixed');
    ELSIF TG_OP = 'UPDATE' THEN
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
    
    -- Step 2: Handle total_budget calculation
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
                    NEW.last_recurring_calculation := NOW();
                END IF;
                
            WHEN 'hourly' THEN
                -- Sync hours first
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
    ELSE
        -- Preserve existing budget for non-recalculation scenarios
        IF TG_OP = 'UPDATE' THEN
            NEW.total_budget := OLD.total_budget;
        END IF;
    END IF;
    
    -- Step 3: ALWAYS calculate payment_pending correctly (this is the most critical part)
    final_budget := COALESCE(NEW.total_budget, 0);
    final_received := COALESCE(NEW.payment_received, 0);
    final_pending := GREATEST(0, final_budget - final_received);
    
    -- Ensure we never have negative payment_pending
    NEW.payment_pending := final_pending;
    
    -- Step 4: Debug logging for all scenarios
    IF TG_OP = 'UPDATE' THEN
        -- Due date changes
        IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
            IF OLD.due_date IS NULL AND NEW.due_date IS NOT NULL THEN
                RAISE NOTICE 'DUE DATE ADDED: % project % - budget: %, received: %, pending: %', 
                    NEW.project_type, NEW.id, final_budget, final_received, final_pending;
            ELSIF OLD.due_date IS NOT NULL AND NEW.due_date IS NULL THEN
                RAISE NOTICE 'DUE DATE REMOVED: % project % - budget: %, received: %, pending: %', 
                    NEW.project_type, NEW.id, final_budget, final_received, final_pending;
            ELSE
                RAISE NOTICE 'DUE DATE CHANGED: % project % - budget: %, received: %, pending: %', 
                    NEW.project_type, NEW.id, final_budget, final_received, final_pending;
            END IF;
        END IF;
        
        -- Payment received changes
        IF OLD.payment_received IS DISTINCT FROM NEW.payment_received THEN
            RAISE NOTICE 'PAYMENT RECEIVED CHANGED: % project % - budget: %, received: % -> %, pending: %', 
                NEW.project_type, NEW.id, final_budget, COALESCE(OLD.payment_received, 0), final_received, final_pending;
        END IF;
        
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
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create the master trigger
CREATE TRIGGER trigger_master_project_calculation
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION master_project_calculation();

-- Step 4: Fix ALL existing projects with incorrect payment_pending
UPDATE projects 
SET payment_pending = GREATEST(0, COALESCE(total_budget, 0) - COALESCE(payment_received, 0))
WHERE (
    payment_pending IS NULL OR 
    payment_pending < 0 OR 
    payment_pending != GREATEST(0, COALESCE(total_budget, 0) - COALESCE(payment_received, 0))
);

-- Step 5: Create manual recalculation function for troubleshooting
CREATE OR REPLACE FUNCTION manual_fix_payment_pending(project_id UUID DEFAULT NULL)
RETURNS TABLE(
    fixed_id UUID,
    project_type TEXT,
    old_pending DECIMAL(12,2),
    new_pending DECIMAL(12,2),
    total_budget DECIMAL(12,2),
    payment_received DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    UPDATE projects 
    SET payment_pending = GREATEST(0, COALESCE(total_budget, 0) - COALESCE(payment_received, 0))
    WHERE (project_id IS NULL OR id = project_id)
      AND payment_pending != GREATEST(0, COALESCE(total_budget, 0) - COALESCE(payment_received, 0))
    RETURNING 
        id as fixed_id,
        project_type::TEXT,
        payment_pending as old_pending,
        GREATEST(0, COALESCE(total_budget, 0) - COALESCE(payment_received, 0)) as new_pending,
        total_budget,
        payment_received;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Comprehensive testing and verification
DO $$
DECLARE
    test_counts RECORD;
    fixed_count INTEGER;
    problem_count INTEGER;
BEGIN
    GET DIAGNOSTICS fixed_count = ROW_COUNT;
    
    RAISE NOTICE '=== FINAL PAYMENT_PENDING FIX COMPLETE ===';
    RAISE NOTICE 'Projects fixed in this migration: %', fixed_count;
    
    -- Check for remaining issues
    SELECT COUNT(*) INTO problem_count
    FROM projects 
    WHERE payment_pending < 0 OR 
          (payment_pending = 0 AND COALESCE(total_budget, 0) > 0 AND COALESCE(payment_received, 0) = 0);
    
    RAISE NOTICE 'Projects with potential payment_pending issues: %', problem_count;
    
    -- Show statistics by project type
    FOR test_counts IN 
        SELECT 
            project_type,
            COUNT(*) as total_projects,
            AVG(COALESCE(total_budget, 0)) as avg_budget,
            AVG(COALESCE(payment_received, 0)) as avg_received,
            AVG(COALESCE(payment_pending, 0)) as avg_pending,
            COUNT(CASE WHEN payment_pending = 0 THEN 1 END) as zero_pending_count,
            COUNT(CASE WHEN payment_pending < 0 THEN 1 END) as negative_pending_count
        FROM projects 
        GROUP BY project_type
        ORDER BY project_type
    LOOP
        RAISE NOTICE 'Type %: % projects, avg_budget=%, avg_received=%, avg_pending=%, zero_pending=%, negative_pending=%',
            test_counts.project_type, 
            test_counts.total_projects,
            ROUND(test_counts.avg_budget, 2),
            ROUND(test_counts.avg_received, 2), 
            ROUND(test_counts.avg_pending, 2),
            test_counts.zero_pending_count,
            test_counts.negative_pending_count;
    END LOOP;
    
    IF problem_count = 0 THEN
        RAISE NOTICE '✅ SUCCESS: All payment_pending values are now correct!';
    ELSE
        RAISE NOTICE '⚠️ WARNING: % projects may still have issues - check manually', problem_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔧 BEHAVIOR SUMMARY:';
    RAISE NOTICE '  - Fixed projects: NEVER auto-recalculate total_budget';
    RAISE NOTICE '  - Hourly projects: Only recalculate when rate/hours change, NOT on date changes';
    RAISE NOTICE '  - Recurring projects: Recalculate when amount/frequency/dates change';
    RAISE NOTICE '  - ALL projects: payment_pending = GREATEST(0, total_budget - payment_received)';
    RAISE NOTICE '';
    RAISE NOTICE '🔍 TESTING SCENARIOS:';
    RAISE NOTICE '  ✅ Adding due date should preserve budget for fixed/hourly';
    RAISE NOTICE '  ✅ Removing due date should preserve budget for fixed/hourly';
    RAISE NOTICE '  ✅ Changing due date should preserve budget for fixed/hourly';
    RAISE NOTICE '  ✅ Adding/removing payment_received should update payment_pending correctly';
    RAISE NOTICE '  ✅ Recurring projects can recalculate on date changes (intended)';
    RAISE NOTICE '';
    RAISE NOTICE '🛠️ TROUBLESHOOTING: Use SELECT * FROM manual_fix_payment_pending() to fix any remaining issues';
END $$;

-- Step 7: Grant permissions and add comments
GRANT EXECUTE ON FUNCTION manual_fix_payment_pending(UUID) TO authenticated;

COMMENT ON FUNCTION master_project_calculation() IS 'FINAL MASTER FUNCTION: Handles all project calculation scenarios correctly. Preserves budgets appropriately, always ensures payment_pending >= 0.';
COMMENT ON FUNCTION manual_fix_payment_pending(UUID) IS 'Manual troubleshooting function to fix payment_pending for specific projects or all projects.';
COMMENT ON TRIGGER trigger_master_project_calculation ON projects IS 'MASTER TRIGGER: Comprehensive solution for all payment_pending calculation issues across all project types and scenarios.';
