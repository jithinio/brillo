-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for querying by type and created_at
CREATE INDEX IF NOT EXISTS idx_system_logs_type_created ON system_logs(type, created_at DESC);

-- Grant permissions
GRANT SELECT ON system_logs TO authenticated;

-- Add RLS policies
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert logs
CREATE POLICY "Service role can insert logs" ON system_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Authenticated users can view logs (optional - remove if not needed)
CREATE POLICY "Authenticated users can view logs" ON system_logs
  FOR SELECT USING (auth.role() = 'authenticated');
