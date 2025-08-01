-- Set lost projects to have status=NULL so they don't appear in any project status pages
-- They should only appear in the pipeline lost clients sidebar

-- Update lost projects to have null status
UPDATE projects 
SET 
    status = NULL,
    updated_at = NOW()
WHERE 
    pipeline_stage = 'lost';

-- Verify the results
SELECT 
    status,
    pipeline_stage,
    COUNT(*) as count,
    'Projects after setting lost projects to null status' as description
FROM projects 
WHERE pipeline_stage = 'lost' OR status IS NULL
GROUP BY status, pipeline_stage
ORDER BY status NULLS FIRST, pipeline_stage;

-- Check that no lost projects have any status
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ SUCCESS: All lost projects have null status'
        ELSE CONCAT('❌ ERROR: Found ', COUNT(*), ' lost projects with non-null status')
    END as validation_result
FROM projects 
WHERE pipeline_stage = 'lost' AND status IS NOT NULL;