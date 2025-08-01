-- Fix lost projects to have status='pipeline' instead of 'cancelled'
-- This ensures lost projects don't appear in cancelled projects page
-- They should only appear in the pipeline lost clients sidebar

-- Update any existing lost projects that have status='cancelled' back to 'pipeline'
UPDATE projects 
SET 
    status = 'pipeline',
    updated_at = NOW()
WHERE 
    pipeline_stage = 'lost' 
    AND status = 'cancelled';

-- Show the results
SELECT 
    status,
    pipeline_stage,
    COUNT(*) as count,
    'Projects by status and pipeline_stage' as description
FROM projects 
WHERE pipeline_stage = 'lost' OR status = 'cancelled'
GROUP BY status, pipeline_stage
ORDER BY status, pipeline_stage;

-- Verify no lost projects appear in cancelled status
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: No lost projects in cancelled status'
        ELSE '❌ ERROR: Found lost projects in cancelled status'
    END as validation_result
FROM projects 
WHERE pipeline_stage = 'lost' AND status = 'cancelled';