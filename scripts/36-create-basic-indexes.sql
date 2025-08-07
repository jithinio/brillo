-- Basic performance optimization indexes for project filtering
-- This script works without requiring extensions or special privileges
-- Use this if the main performance script fails due to pg_trgm extension issues

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

-- Basic text search indexes (without trigram support)
CREATE INDEX IF NOT EXISTS idx_projects_name_basic ON projects(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_description_basic ON projects(description) WHERE description IS NOT NULL;

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

-- Analyze tables to update statistics for the query planner
ANALYZE projects;
ANALYZE clients;

-- Note: Materialized view creation skipped in basic version
-- Basic indexes will still provide significant performance improvements

SELECT 'Basic performance indexes created successfully!' as status;