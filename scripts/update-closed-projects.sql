-- Update existing active projects that came from pipeline to have pipeline_stage = 'closed'
-- This helps distinguish between:
-- 1. Regular projects (pipeline_stage = NULL) - show on project pages
-- 2. Closed pipeline deals (pipeline_stage = 'closed') - show on project pages  
-- 3. Lost pipeline deals (pipeline_stage = 'lost') - hide from project pages

-- Update active projects that have a pipeline_stage (meaning they came from pipeline)
-- but aren't 'lost', to be marked as 'closed' deals
UPDATE projects 
SET 
    pipeline_stage = 'closed',
    deal_probability = 100,
    updated_at = NOW()
WHERE 
    status = 'active' 
    AND pipeline_stage IS NOT NULL 
    AND pipeline_stage != 'lost'
    AND pipeline_stage != 'closed'; -- Don't update if already closed

-- Show how many projects were updated
SELECT 
    COUNT(*) as updated_projects,
    'Active projects from pipeline marked as closed deals' as description
FROM projects 
WHERE 
    status = 'active' 
    AND pipeline_stage = 'closed';

-- Show the breakdown of all projects by status and pipeline_stage
SELECT 
    status,
    pipeline_stage,
    COUNT(*) as count
FROM projects 
GROUP BY status, pipeline_stage
ORDER BY status, pipeline_stage NULLS FIRST;