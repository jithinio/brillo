-- Add pipeline support to clients table
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='status') THEN
        ALTER TABLE clients ADD COLUMN status VARCHAR(50) DEFAULT 'active';
    END IF;
    
    -- Add pipeline_stage column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='pipeline_stage') THEN
        ALTER TABLE clients ADD COLUMN pipeline_stage VARCHAR(50) DEFAULT 'lead';
    END IF;
    
    -- Add potential_value column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='potential_value') THEN
        ALTER TABLE clients ADD COLUMN potential_value DECIMAL(15,2);
    END IF;
    
    -- Add deal_probability column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='deal_probability') THEN
        ALTER TABLE clients ADD COLUMN deal_probability INTEGER DEFAULT 10;
    END IF;
    
    -- Add notes column if it doesn't exist (for pipeline-specific notes)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='pipeline_notes') THEN
        ALTER TABLE clients ADD COLUMN pipeline_notes TEXT;
    END IF;
END $$;

-- Create pipeline_stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    default_probability INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pipeline_stages
DROP POLICY IF EXISTS "Users can view their own pipeline stages" ON pipeline_stages;
CREATE POLICY "Users can view their own pipeline stages" 
    ON pipeline_stages FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pipeline stages" ON pipeline_stages;
CREATE POLICY "Users can insert their own pipeline stages" 
    ON pipeline_stages FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own pipeline stages" ON pipeline_stages;
CREATE POLICY "Users can update their own pipeline stages" 
    ON pipeline_stages FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own pipeline stages" ON pipeline_stages;
CREATE POLICY "Users can delete their own pipeline stages" 
    ON pipeline_stages FOR DELETE 
    USING (auth.uid() = user_id);

-- Insert default pipeline stages for existing users
INSERT INTO pipeline_stages (user_id, name, order_index, color, default_probability)
SELECT 
    id as user_id,
    stage_name,
    stage_order,
    stage_color,
    stage_probability
FROM auth.users,
(VALUES 
    ('Lead', 1, '#3B82F6', 10),
    ('Pitched', 2, '#F59E0B', 30),
    ('In Discussion', 3, '#8B5CF6', 60)
) AS stages(stage_name, stage_order, stage_color, stage_probability)
ON CONFLICT DO NOTHING;

-- Create function to automatically create default stages for new users
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pipeline_stages (user_id, name, order_index, color, default_probability)
    VALUES 
        (NEW.id, 'Lead', 1, '#3B82F6', 10),
        (NEW.id, 'Pitched', 2, '#F59E0B', 30),
        (NEW.id, 'In Discussion', 3, '#8B5CF6', 60);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create default stages for new users
DROP TRIGGER IF EXISTS create_pipeline_stages_for_new_user ON auth.users;
CREATE TRIGGER create_pipeline_stages_for_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_pipeline_stages(); 