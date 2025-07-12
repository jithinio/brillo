-- Fix the status constraint to include additional status values used in CSV import
-- This resolves the "projects_status_check" constraint violation

-- Drop the existing status constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the new status constraint with additional values
ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'in_progress', 'pending', 'draft'));

-- Display current status values in the database to verify
SELECT DISTINCT status 
FROM projects 
WHERE status IS NOT NULL
ORDER BY status;

-- Show the updated constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE conrelid = 'projects'::regclass 
  AND conname LIKE '%status%'; 