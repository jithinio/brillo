-- Create project filter preferences table with proper constraints
-- This script is safe to run multiple times

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS project_filter_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filter_name TEXT NOT NULL,
    filter_value JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, filter_name)
);

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own filter preferences" ON project_filter_preferences;

-- Create RLS policies
ALTER TABLE project_filter_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own filter preferences" ON project_filter_preferences
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_user_id 
    ON project_filter_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_filter_name 
    ON project_filter_preferences(filter_name);

-- Grant necessary permissions
GRANT ALL ON project_filter_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 