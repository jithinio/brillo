-- Manual setup script for project_filter_preferences table
-- Run this in your Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS project_filter_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filter_name TEXT NOT NULL,
  filter_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, filter_name)
);

-- Enable RLS
ALTER TABLE project_filter_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own filter preferences" ON project_filter_preferences;
DROP POLICY IF EXISTS "Users can insert their own filter preferences" ON project_filter_preferences;
DROP POLICY IF EXISTS "Users can update their own filter preferences" ON project_filter_preferences;
DROP POLICY IF EXISTS "Users can delete their own filter preferences" ON project_filter_preferences;

CREATE POLICY "Users can view their own filter preferences" ON project_filter_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filter preferences" ON project_filter_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter preferences" ON project_filter_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter preferences" ON project_filter_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_user_id ON project_filter_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_filter_name ON project_filter_preferences(filter_name);

-- Test the table with a sample insert (optional)
-- INSERT INTO project_filter_preferences (user_id, filter_name, filter_value)
-- VALUES (
--   '00000000-0000-0000-0000-000000000000',
--   'test_filter',
--   '{"status": ["active"], "client": [], "dateRange": {"start": null, "end": null}, "budget": {"min": null, "max": null}}'::jsonb
-- );

-- Clean up test data (uncomment if you ran the test insert above)
-- DELETE FROM project_filter_preferences WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Verify the table was created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_filter_preferences'
ORDER BY ordinal_position; 