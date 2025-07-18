-- Add pipeline status to projects table
-- This adds 'pipeline' as a new valid status option for projects

-- Update the status constraint to include 'pipeline'
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IN ('active', 'completed', 'on_hold', 'cancelled', 'pipeline'));

-- Add comment to document the new status
COMMENT ON COLUMN projects.status IS 'Project status: active, completed, on_hold, cancelled, or pipeline'; 