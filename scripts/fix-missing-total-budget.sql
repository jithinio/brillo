-- Fix missing total_budget field in projects table
-- This script safely adds the total_budget field if it doesn't exist

BEGIN;

-- Check if total_budget column exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'total_budget' 
        AND table_schema = 'public'
    ) THEN
        -- Add total_budget column
        ALTER TABLE projects ADD COLUMN total_budget DECIMAL(12,2);
        
        -- Initialize total_budget with current budget values
        UPDATE projects SET total_budget = COALESCE(budget, 0) WHERE total_budget IS NULL;
        
        RAISE NOTICE 'Added total_budget column and initialized with budget values';
    ELSE
        RAISE NOTICE 'total_budget column already exists';
    END IF;
END $$;

-- Also ensure that existing records have total_budget populated
UPDATE projects 
SET total_budget = COALESCE(budget, 0)
WHERE total_budget IS NULL;

COMMIT;

-- Verify the result
SELECT 
    COUNT(*) as total_projects,
    COUNT(total_budget) as projects_with_total_budget,
    COUNT(budget) as projects_with_budget,
    AVG(COALESCE(total_budget, 0)) as avg_total_budget,
    AVG(COALESCE(budget, 0)) as avg_budget
FROM projects;
