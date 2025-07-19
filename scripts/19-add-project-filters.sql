-- Add project filter preferences table
CREATE TABLE IF NOT EXISTS project_filter_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filter_name TEXT NOT NULL,
  filter_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, filter_name)
);

-- Add RLS policies for project_filter_preferences
ALTER TABLE project_filter_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own filter preferences" ON project_filter_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own filter preferences" ON project_filter_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own filter preferences" ON project_filter_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own filter preferences" ON project_filter_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_user_id ON project_filter_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_project_filter_preferences_filter_name ON project_filter_preferences(filter_name); 