-- Performance optimization indexes for project filtering
-- Run this script to create indexes that will dramatically improve filter performance

-- First, ensure required extensions are available
-- Note: This requires superuser privileges or pre-installed extensions
DO $$
BEGIN
    -- Try to create pg_trgm extension for trigram text search
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
    RAISE NOTICE 'pg_trgm extension enabled successfully';
EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create pg_trgm extension. Text search indexes will be skipped.';
WHEN feature_not_supported THEN
    RAISE NOTICE 'pg_trgm extension not available. Text search indexes will be skipped.';
END $$;

-- Index for project status filtering (most common filter)
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE status IS NOT NULL;

-- Index for client filtering
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id) WHERE client_id IS NOT NULL;

-- Index for project type filtering
CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(project_type) WHERE project_type IS NOT NULL;

-- Index for date range filtering (start_date is commonly filtered)
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date) WHERE start_date IS NOT NULL;

-- Compound index for status + start_date (common combination)
CREATE INDEX IF NOT EXISTS idx_projects_status_start_date ON projects(status, start_date) WHERE status IS NOT NULL;

-- Compound index for client + status (common combination)
CREATE INDEX IF NOT EXISTS idx_projects_client_status ON projects(client_id, status) WHERE client_id IS NOT NULL AND status IS NOT NULL;

-- Index for text search on name and description (requires pg_trgm extension)
DO $$
BEGIN
    -- Only create trigram indexes if pg_trgm extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING gin(name gin_trgm_ops);
        CREATE INDEX IF NOT EXISTS idx_projects_description_trgm ON projects USING gin(description gin_trgm_ops) WHERE description IS NOT NULL;
        RAISE NOTICE 'Trigram text search indexes created successfully';
    ELSE
        -- Fallback to regular text indexes
        CREATE INDEX IF NOT EXISTS idx_projects_name_text ON projects(name) WHERE name IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_projects_description_text ON projects(description) WHERE description IS NOT NULL;
        RAISE NOTICE 'Using regular text indexes instead of trigram (pg_trgm not available)';
    END IF;
END $$;

-- Index for sorting by created_at (most common sort)
CREATE INDEX IF NOT EXISTS idx_projects_created_at_desc ON projects(created_at DESC) WHERE status IS NOT NULL;

-- Index for sorting by updated_at
CREATE INDEX IF NOT EXISTS idx_projects_updated_at_desc ON projects(updated_at DESC) WHERE status IS NOT NULL;

-- Index for sorting by name
CREATE INDEX IF NOT EXISTS idx_projects_name_asc ON projects(name ASC) WHERE status IS NOT NULL;

-- Compound index for efficient pagination with cursor
CREATE INDEX IF NOT EXISTS idx_projects_pagination ON projects(created_at DESC, id DESC) WHERE status IS NOT NULL;

-- Index for financial aggregations (budget, expenses, etc.)
CREATE INDEX IF NOT EXISTS idx_projects_financial ON projects(status, total_budget, budget, expenses, payment_received) WHERE status IS NOT NULL;

-- Partial index for active projects (most frequently accessed)
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(created_at DESC, id DESC) WHERE status = 'active';

-- Partial index for pipeline projects
CREATE INDEX IF NOT EXISTS idx_projects_pipeline ON projects(created_at DESC, id DESC) WHERE status = 'pipeline';

-- Extension already handled at the top of the script

-- Analyze tables to update statistics for the query planner
ANALYZE projects;
ANALYZE clients;

-- Create a materialized view for frequently accessed metrics (optional)
CREATE MATERIALIZED VIEW IF NOT EXISTS project_metrics_summary AS
SELECT 
  COUNT(*) FILTER (WHERE status IS NOT NULL) as total_projects,
  COUNT(*) FILTER (WHERE status = 'active') as active_projects,
  COUNT(*) FILTER (WHERE status = 'pipeline') as pipeline_projects,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
  COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_projects,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_projects,
  COALESCE(SUM(COALESCE(total_budget, budget, 0)) FILTER (WHERE status IS NOT NULL), 0) as total_budget,
  COALESCE(SUM(COALESCE(expenses, 0)) FILTER (WHERE status IS NOT NULL), 0) as total_expenses,
  COALESCE(SUM(COALESCE(payment_received, 0)) FILTER (WHERE status IS NOT NULL), 0) as total_received,
  COALESCE(SUM(GREATEST(0, COALESCE(total_budget, budget, 0) - COALESCE(payment_received, 0))) FILTER (WHERE status IS NOT NULL), 0) as total_pending
FROM projects;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_metrics_summary ON project_metrics_summary (total_projects);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW project_metrics_summary;

-- Grant permissions
GRANT SELECT ON project_metrics_summary TO authenticated;
GRANT SELECT ON project_metrics_summary TO anon;