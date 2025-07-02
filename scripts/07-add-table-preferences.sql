-- Add table preferences column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS table_preferences JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.table_preferences IS 'Stores user preferences for table column visibility and other table settings';

-- Example structure:
-- {
--   "clients-table": {
--     "column_visibility": {
--       "phone": false,
--       "location": true,
--       "company": true
--     }
--   },
--   "projects-table": {
--     "column_visibility": {
--       "expenses": false,
--       "pending": true,
--       "created_at": false
--     }
--   }
-- } 