-- OPTIONAL: Clean up duplicate company_settings records
-- This script will keep only the most recent record per user and delete the rest

-- First, let's see what duplicates exist
SELECT user_id, COUNT(*) as record_count, MAX(updated_at) as latest_update
FROM company_settings 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Create a backup table (optional - remove if not needed)
-- CREATE TABLE company_settings_backup AS SELECT * FROM company_settings;

-- Delete duplicates, keeping only the most recent record per user
DELETE FROM company_settings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM company_settings
  ORDER BY user_id, updated_at DESC NULLS LAST
);

-- Add a unique constraint to prevent future duplicates
ALTER TABLE company_settings 
ADD CONSTRAINT unique_user_company_settings 
UNIQUE (user_id);

-- Verify cleanup
SELECT user_id, COUNT(*) as record_count
FROM company_settings 
GROUP BY user_id; 