-- Add pipeline support to projects table
-- This migration adds pipeline fields to projects, enabling project-based pipeline management

DO $$ 
BEGIN
    -- Add pipeline_stage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='pipeline_stage') THEN
        ALTER TABLE projects ADD COLUMN pipeline_stage VARCHAR(50);
    END IF;
    
    -- Add deal_probability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='deal_probability') THEN
        ALTER TABLE projects ADD COLUMN deal_probability INTEGER DEFAULT 10;
    END IF;
    
    -- Add pipeline_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='pipeline_notes') THEN
        ALTER TABLE projects ADD COLUMN pipeline_notes TEXT;
    END IF;
END $$;

-- Update projects with status='pipeline' to have default pipeline_stage if null
UPDATE projects 
SET pipeline_stage = 'lead' 
WHERE status = 'pipeline' AND pipeline_stage IS NULL;

-- Update projects with status='pipeline' to have default deal_probability if null
UPDATE projects 
SET deal_probability = 10 
WHERE status = 'pipeline' AND deal_probability IS NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN projects.pipeline_stage IS 'Current stage in the sales pipeline (e.g., lead, pitched, in discussion)';
COMMENT ON COLUMN projects.deal_probability IS 'Probability of closing the deal (0-100%)';
COMMENT ON COLUMN projects.pipeline_notes IS 'Notes specific to the pipeline process';

-- Display confirmation
SELECT 'Pipeline support added to projects table' as status; 