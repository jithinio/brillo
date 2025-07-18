# Pipeline Migration Guide: Client → Project Pipeline

## Overview
This guide covers the migration from **client-based pipeline** to **project-based pipeline**. This change provides better data organization and integrates pipeline management with the existing project system.

## What Changed

### Before (Client Pipeline)
- Pipeline clients were separate entities
- Client cards showed: name, company, potential value, deal probability
- Conversion meant changing client status to "active"

### After (Project Pipeline)
- Projects with `status='pipeline'` are pipeline items
- Project cards show: name, client (linked), budget, deal probability
- Conversion means changing project status to "active"

## Benefits

1. **Better Data Model**: Projects are natural pipeline units
2. **Financial Integration**: Direct budget/revenue tracking
3. **Client Relationships**: Projects naturally belong to clients
4. **Existing Infrastructure**: Leverages project management features
5. **Status Consistency**: Uses existing project status system

## Migration Steps

### Step 1: Database Schema Update
Run the database migration to add pipeline fields to projects:

```sql
-- Run this in your Supabase SQL Editor
\i scripts/18-add-project-pipeline-support.sql
```

This adds:
- `pipeline_stage` (VARCHAR) - Current pipeline stage
- `deal_probability` (INTEGER) - Deal probability percentage
- `pipeline_notes` (TEXT) - Pipeline-specific notes

### Step 2: Data Migration
Migrate existing client pipeline data to projects:

```bash
# Make sure you have the required dependencies
npm install @supabase/supabase-js dotenv

# Run the migration script
node scripts/migrate-client-pipeline-to-projects.js
```

**What this does:**
1. Fetches all clients with `status='pipeline'`
2. Creates projects from each pipeline client
3. Links projects to original clients via `client_id`
4. Converts original clients to `status='active'`
5. Preserves all pipeline data (stage, probability, notes)

### Step 3: Verification
The script automatically verifies the migration, but you can manually check:

```sql
-- Check remaining pipeline clients (should be 0)
SELECT COUNT(*) FROM clients WHERE status = 'pipeline';

-- Check created pipeline projects
SELECT COUNT(*) FROM projects WHERE status = 'pipeline';

-- View migrated projects
SELECT 
  p.name,
  p.budget,
  p.deal_probability,
  p.pipeline_stage,
  c.name as client_name
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.status = 'pipeline';
```

## Field Mapping

| Old (Client Pipeline) | New (Project Pipeline) | Notes |
|----------------------|------------------------|-------|
| `client.name` | `project.name` | Project name includes client info |
| `client.company` | `client.name` (via relation) | Shown via client relationship |
| `client.potential_value` | `project.budget` | Budget represents potential value |
| `client.deal_probability` | `project.deal_probability` | Unchanged |
| `client.pipeline_notes` | `project.pipeline_notes` | Unchanged |
| `client.pipeline_stage` | `project.pipeline_stage` | Unchanged |

## Features Preserved

All existing pipeline features work exactly the same:

✅ **Kanban Board** - Drag & drop between stages  
✅ **Pipeline Stages** - Configurable stages with colors  
✅ **Deal Probability** - Progress tracking with percentages  
✅ **Pipeline Notes** - Project-specific notes  
✅ **Metrics Dashboard** - Revenue forecasting and analytics  
✅ **Add/Edit/Delete** - Full CRUD operations  
✅ **Convert to Active** - Move to active projects  
✅ **Context Menus** - Right-click actions  
✅ **Optimistic Updates** - Instant UI feedback  
✅ **Confetti Animation** - Celebration on conversion  

## New Features

🆕 **Client Integration** - Projects link to clients  
🆕 **Financial Tracking** - Budget, revenue, expenses  
🆕 **Project Management** - Due dates, descriptions  
🆕 **Status Consistency** - Uses project status system  

## UI Changes

### Pipeline Cards Now Show:
- **Project Name** (instead of client name)
- **Client Name** (below project name with user icon)
- **Budget** (instead of "Potential Value")
- **Deal Probability** (unchanged)
- **Pipeline Notes** (unchanged)

### Dialogs:
- **Add Project** (instead of Add Client)
- **Edit Project** (instead of Edit Client)
- **Delete Project** (instead of Delete Client)

### Messages:
- "Convert to Active Project" (instead of "Convert to Active Client")
- "Project added to pipeline" (instead of "Client added to pipeline")

## Rollback Plan

If you need to rollback (not recommended after migration):

```sql
-- This would restore client pipeline data
-- WARNING: Only use if you have backed up your data
UPDATE clients 
SET 
  status = 'pipeline',
  pipeline_stage = p.pipeline_stage,
  deal_probability = p.deal_probability,
  pipeline_notes = p.pipeline_notes
FROM projects p 
WHERE clients.id = p.client_id 
AND p.status = 'pipeline';

-- Then delete the migrated projects
DELETE FROM projects WHERE status = 'pipeline';
```

## Troubleshooting

### Migration Script Issues

**Error: "Missing Supabase environment variables"**
- Ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

**Error: "Failed to fetch pipeline clients"**
- Check database connection
- Verify RLS policies allow access

**Error: "Failed to insert projects"**
- Ensure projects table has pipeline fields (run migration 18 first)
- Check for data validation errors

### UI Issues

**Error: "Cannot find module"**
- Restart your development server
- Clear Next.js cache: `rm -rf .next`

**Cards not displaying correctly**
- Check browser console for errors
- Verify data migration completed successfully

### Data Issues

**Missing project data**
- Verify migration script completed successfully
- Check that clients were properly linked to projects

**Pipeline stages not working**
- Ensure `pipeline_stages` table exists and has data
- Check RLS policies for pipeline_stages

## Project-Pipeline Integration

After the migration, projects and pipeline work seamlessly together:

### Converting Projects to Pipeline

1. **From Projects Page**: Change any project status to "Pipeline"
   - Project automatically gets `pipeline_stage="lead"` and `deal_probability=10`
   - Shows success message: "Project moved to Pipeline"
   - Project immediately appears in Pipeline page

2. **From Pipeline Page**: Convert pipeline projects to "Active"
   - Project status changes to "active"
   - Pipeline fields are cleared (`pipeline_stage`, `deal_probability`, `pipeline_notes` = null)
   - Project appears in Projects page as active

### Integration Benefits

- **Seamless Workflow**: Move projects between active work and sales pipeline
- **Automatic Field Management**: Pipeline fields are automatically set/cleared
- **Consistent Data**: No orphaned or inconsistent pipeline data
- **User-Friendly**: Clear feedback and automatic navigation

### Testing Integration

Run the integration test to verify functionality:

```bash
node scripts/test-pipeline-integration.js
```

This test:
- Converts a project to pipeline status
- Verifies it appears in pipeline with correct fields
- Converts it back to active
- Confirms pipeline fields are cleared

## Support

If you encounter issues:

1. **Check the console** for error messages
2. **Verify database schema** - ensure migration 18 ran successfully
3. **Check data migration** - ensure the migration script completed
4. **Restart development server** - clear any cached modules

## Summary

✅ **Database schema updated** - Projects table has pipeline fields  
✅ **Data migrated** - Client pipeline data → Project pipeline data  
✅ **Components updated** - All UI components use projects  
✅ **Features preserved** - No functionality lost  
✅ **New features added** - Better integration and data model  

Your pipeline now uses projects instead of clients, providing better organization and integration with your existing project management system! 