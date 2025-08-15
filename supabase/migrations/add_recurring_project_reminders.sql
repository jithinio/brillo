-- Create table to track recurring project reminders
CREATE TABLE IF NOT EXISTS recurring_project_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  reminder_type VARCHAR(50) NOT NULL DEFAULT 'invoice_due',
  sent_at TIMESTAMP WITH TIME ZONE,
  email_id TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_recurring_reminders_project_id ON recurring_project_reminders(project_id);
CREATE INDEX idx_recurring_reminders_user_id ON recurring_project_reminders(user_id);
CREATE INDEX idx_recurring_reminders_reminder_date ON recurring_project_reminders(reminder_date);
CREATE INDEX idx_recurring_reminders_status ON recurring_project_reminders(status);
CREATE INDEX idx_recurring_reminders_sent_at ON recurring_project_reminders(sent_at);

-- Create composite index for finding pending reminders
CREATE INDEX idx_recurring_reminders_pending ON recurring_project_reminders(reminder_date, status) 
WHERE status = 'pending';

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recurring_reminder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recurring_reminder_timestamp
BEFORE UPDATE ON recurring_project_reminders
FOR EACH ROW
EXECUTE FUNCTION update_recurring_reminder_timestamp();

-- Create view for upcoming reminders
CREATE OR REPLACE VIEW upcoming_recurring_reminders AS
SELECT 
  rpr.*,
  p.name as project_name,
  p.recurring_frequency,
  p.recurring_amount,
  p.currency,
  p.start_date,
  p.due_date,
  p.status as project_status,
  c.name as client_name,
  c.email as client_email,
  u.email as user_email,
  cs.company_name,
  cs.company_email
FROM recurring_project_reminders rpr
JOIN projects p ON rpr.project_id = p.id
JOIN clients c ON p.client_id = c.id
JOIN auth.users u ON rpr.user_id = u.id
LEFT JOIN company_settings cs ON cs.user_id = rpr.user_id
WHERE rpr.status = 'pending'
  AND rpr.reminder_date <= CURRENT_DATE
  AND p.status IN ('active', 'due')
  AND p.project_type = 'recurring';

-- Function to calculate next reminder date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_reminder_date(
  due_date DATE,
  frequency VARCHAR,
  days_before INTEGER DEFAULT 7
) RETURNS DATE AS $$
DECLARE
  reminder_date DATE;
BEGIN
  -- Calculate reminder date (due_date minus days_before)
  reminder_date := due_date - INTERVAL '1 day' * days_before;
  
  -- Ensure reminder date is not in the past
  IF reminder_date < CURRENT_DATE THEN
    reminder_date := CURRENT_DATE;
  END IF;
  
  RETURN reminder_date;
END;
$$ LANGUAGE plpgsql;

-- Function to generate reminders for a project
CREATE OR REPLACE FUNCTION generate_project_reminders(
  p_project_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  project_record RECORD;
  next_due_date DATE;
  reminder_date DATE;
  days_before INTEGER;
  period_start DATE;
  period_end DATE;
BEGIN
  -- Get project details
  SELECT * INTO project_record
  FROM projects
  WHERE id = p_project_id
    AND project_type = 'recurring'
    AND status IN ('active', 'due');
    
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Determine days before based on frequency
  CASE project_record.recurring_frequency
    WHEN 'yearly' THEN days_before := 10;
    WHEN 'quarterly' THEN days_before := 10;
    WHEN 'monthly' THEN days_before := 7;
    WHEN 'weekly' THEN days_before := 3;
    ELSE days_before := 7;
  END CASE;
  
  -- Calculate next due date based on current date and frequency
  IF project_record.due_date IS NOT NULL AND project_record.due_date > CURRENT_DATE THEN
    next_due_date := project_record.due_date;
  ELSE
    -- Calculate next due date based on start date and frequency
    next_due_date := project_record.start_date;
    
    WHILE next_due_date <= CURRENT_DATE LOOP
      CASE project_record.recurring_frequency
        WHEN 'weekly' THEN 
          next_due_date := next_due_date + INTERVAL '1 week';
        WHEN 'monthly' THEN 
          next_due_date := next_due_date + INTERVAL '1 month';
        WHEN 'quarterly' THEN 
          next_due_date := next_due_date + INTERVAL '3 months';
        WHEN 'yearly' THEN 
          next_due_date := next_due_date + INTERVAL '1 year';
      END CASE;
    END LOOP;
  END IF;
  
  -- Calculate reminder date
  reminder_date := calculate_next_reminder_date(next_due_date, project_record.recurring_frequency, days_before);
  
  -- Calculate period dates
  period_start := next_due_date;
  CASE project_record.recurring_frequency
    WHEN 'weekly' THEN 
      period_end := next_due_date + INTERVAL '1 week' - INTERVAL '1 day';
    WHEN 'monthly' THEN 
      period_end := next_due_date + INTERVAL '1 month' - INTERVAL '1 day';
    WHEN 'quarterly' THEN 
      period_end := next_due_date + INTERVAL '3 months' - INTERVAL '1 day';
    WHEN 'yearly' THEN 
      period_end := next_due_date + INTERVAL '1 year' - INTERVAL '1 day';
  END CASE;
  
  -- Check if reminder already exists for this period
  IF NOT EXISTS (
    SELECT 1 FROM recurring_project_reminders
    WHERE project_id = p_project_id
      AND period_start = period_start
      AND period_end = period_end
  ) THEN
    -- Insert new reminder
    INSERT INTO recurring_project_reminders (
      project_id,
      user_id,
      reminder_date,
      period_start,
      period_end,
      reminder_type,
      status
    ) VALUES (
      p_project_id,
      p_user_id,
      reminder_date,
      period_start,
      period_end,
      'invoice_due',
      'pending'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old sent reminders (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_reminders() RETURNS VOID AS $$
BEGIN
  DELETE FROM recurring_project_reminders
  WHERE status = 'sent'
    AND sent_at < CURRENT_DATE - INTERVAL '6 months';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON recurring_project_reminders TO authenticated;
GRANT ALL ON upcoming_recurring_reminders TO authenticated;

-- Add RLS policies
ALTER TABLE recurring_project_reminders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own reminders
CREATE POLICY "Users can view own reminders" ON recurring_project_reminders
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reminders
CREATE POLICY "Users can insert own reminders" ON recurring_project_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reminders
CREATE POLICY "Users can update own reminders" ON recurring_project_reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own reminders
CREATE POLICY "Users can delete own reminders" ON recurring_project_reminders
  FOR DELETE USING (auth.uid() = user_id);
