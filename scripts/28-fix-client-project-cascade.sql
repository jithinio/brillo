-- Fix client-project relationship to SET NULL instead of CASCADE
-- This prevents projects from being deleted when their associated client is deleted

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_client_id_fkey;

-- Step 2: Add the new foreign key constraint with SET NULL behavior
ALTER TABLE projects ADD CONSTRAINT projects_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Step 3: Also fix invoices table if it has CASCADE (it should be SET NULL)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;
ALTER TABLE invoices ADD CONSTRAINT invoices_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL;

-- Step 4: Create index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);

-- Step 5: Add a comment to document the change
COMMENT ON CONSTRAINT projects_client_id_fkey ON projects IS 
    'Foreign key to clients table with SET NULL on delete to preserve projects when client is removed';

COMMENT ON CONSTRAINT invoices_client_id_fkey ON invoices IS 
    'Foreign key to clients table with SET NULL on delete to preserve invoices when client is removed'; 