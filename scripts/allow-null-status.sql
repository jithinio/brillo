-- Allow NULL values for status column in projects table
-- This is needed for lost projects which should have no status

-- Remove NOT NULL constraint if it exists
ALTER TABLE projects ALTER COLUMN status DROP NOT NULL;

-- Update the status constraint to allow NULL values
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE projects 
ADD CONSTRAINT projects_status_check 
CHECK (status IS NULL OR status IN ('active', 'completed', 'on_hold', 'cancelled', 'pipeline'));

-- Add comment
COMMENT ON COLUMN projects.status IS 'Project status: active, completed, on_hold, cancelled, pipeline, or NULL for lost projects';