-- Simple script to fix lost projects status
-- Run this in Supabase SQL Editor

-- Update lost projects to have status='pipeline' instead of 'cancelled'
UPDATE projects 
SET status = 'pipeline', updated_at = NOW()
WHERE pipeline_stage = 'lost' AND status = 'cancelled';

-- Check the results
SELECT 
    status,
    pipeline_stage,
    COUNT(*) as count
FROM projects 
WHERE pipeline_stage = 'lost'
GROUP BY status, pipeline_stage;