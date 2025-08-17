-- Migration: Add automatic project total calculation trigger
-- This trigger automatically calculates total_budget for recurring and hourly projects
-- while ensuring fixed projects are never affected

-- Create the auto-calculation function
CREATE OR REPLACE FUNCTION auto_calculate_project_total()
RETURNS TRIGGER AS $$
DECLARE
    start_date_val DATE;
    end_date_val DATE;
    periods_count INTEGER;
    calculated_total DECIMAL(12,2);
    days_diff INTEGER;
    current_date_val DATE := CURRENT_DATE;
BEGIN
    -- Only calculate if auto_calculate_total is enabled
    IF NEW.auto_calculate_total = false THEN
        -- Still need to ensure payment_pending is non-negative
        NEW.payment_pending := GREATEST(0, COALESCE(NEW.total_budget, 0) - COALESCE(NEW.payment_received, 0));
        RETURN NEW;
    END IF;
    
    -- CRITICAL: Never modify total_budget for fixed projects
    IF NEW.project_type = 'fixed' THEN
        -- Only calculate payment_pending for fixed projects
        NEW.payment_pending := GREATEST(0, COALESCE(NEW.total_budget, 0) - COALESCE(NEW.payment_received, 0));
        RETURN NEW;
    END IF;
    
    CASE NEW.project_type
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
    
    -- CRITICAL FIX: Always ensure payment_pending is non-negative
    -- Use GREATEST to prevent negative values that violate constraints
    NEW.payment_pending := GREATEST(0, COALESCE(NEW.total_budget, 0) - COALESCE(NEW.payment_received, 0));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that runs on INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_auto_calculate_project_total ON projects;
CREATE TRIGGER trigger_auto_calculate_project_total
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_project_total();

-- Add comment for documentation
COMMENT ON FUNCTION auto_calculate_project_total() IS 'Automatically calculates total_budget for recurring and hourly projects based on their parameters. Fixed projects are never affected.';

-- Create a function to manually trigger recalculation for a specific project
CREATE OR REPLACE FUNCTION recalculate_project_total(project_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    project_record RECORD;
    updated_rows INTEGER;
BEGIN
    -- Get the project
    SELECT * INTO project_record
    FROM projects
    WHERE id = project_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Skip if auto-calculation is disabled or it's a fixed project
    IF project_record.auto_calculate_total = FALSE OR project_record.project_type = 'fixed' THEN
        RETURN TRUE;
    END IF;
    
    -- Update the project to trigger the calculation (update updated_at to trigger the trigger)
    UPDATE projects 
    SET updated_at = NOW()
    WHERE id = project_id;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    RETURN updated_rows > 0;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION recalculate_project_total(UUID) TO authenticated;

-- Add comment for the manual recalculation function
COMMENT ON FUNCTION recalculate_project_total(UUID) IS 'Manually triggers recalculation of total_budget for a specific project by updating its updated_at timestamp.';
