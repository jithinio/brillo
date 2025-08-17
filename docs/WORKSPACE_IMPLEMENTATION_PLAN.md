# Brillo Workspace Implementation Plan

## Overview
This document outlines a comprehensive plan to implement workspace functionality in the Brillo application, enabling multi-tenant team collaboration while maintaining backward compatibility with existing single-user accounts.

## 🎯 Goals
1. Enable team collaboration through workspaces
2. Implement role-based access control (Admin, Manager, View Access)
3. Maintain backward compatibility with existing users
4. Ensure data isolation between workspaces
5. Scale efficiently with minimal performance impact

## 🏗️ Architecture Overview

### Current State
- Single-user architecture
- Each user owns their data directly
- Simple RLS policies based on `user_id`
- No team or organization concept

### Target State
- Multi-tenant workspace architecture
- Users belong to one or more workspaces
- Role-based permissions within workspaces
- Backward compatible with single-user mode

## 📊 Database Schema Design

### 1. Core Workspace Tables

```sql
-- Workspaces table
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  logo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Workspace settings
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Billing (link to existing subscription system)
  subscription_plan_id TEXT,
  polar_customer_id TEXT,
  polar_subscription_id TEXT,
  
  -- Soft delete support
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Workspace members table
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  
  -- Member metadata
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  -- Permissions override (for custom permissions)
  custom_permissions JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique membership
  UNIQUE(workspace_id, user_id)
);

-- Workspace invitations table
CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'viewer')),
  
  invited_by UUID REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(workspace_id, email)
);

-- User's default workspace preference
ALTER TABLE profiles ADD COLUMN default_workspace_id UUID REFERENCES workspaces(id);

-- Index for performance
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_workspaces_slug ON workspaces(slug);
```

### 2. Migrate Existing Tables

```sql
-- Add workspace_id to all data tables
ALTER TABLE projects ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
ALTER TABLE clients ADD COLUMN workspace_id UUID REFERENCES workspaces(id);
ALTER TABLE invoices ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

-- Create indexes for performance
CREATE INDEX idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX idx_clients_workspace_id ON clients(workspace_id);
CREATE INDEX idx_invoices_workspace_id ON invoices(workspace_id);

-- Migration function to create personal workspaces for existing users
CREATE OR REPLACE FUNCTION migrate_users_to_workspaces() RETURNS void AS $$
DECLARE
  user_record RECORD;
  workspace_id UUID;
BEGIN
  FOR user_record IN SELECT id, email FROM auth.users
  LOOP
    -- Create personal workspace
    INSERT INTO workspaces (name, slug, created_by)
    VALUES (
      COALESCE(user_record.email, 'Personal Workspace'),
      'personal-' || user_record.id,
      user_record.id
    )
    RETURNING id INTO workspace_id;
    
    -- Add user as admin
    INSERT INTO workspace_members (workspace_id, user_id, role, status, accepted_at)
    VALUES (workspace_id, user_record.id, 'admin', 'active', now());
    
    -- Update user's default workspace
    UPDATE profiles 
    SET default_workspace_id = workspace_id 
    WHERE id = user_record.id;
    
    -- Migrate existing data
    UPDATE projects SET workspace_id = workspace_id WHERE user_id = user_record.id;
    UPDATE clients SET workspace_id = workspace_id WHERE user_id = user_record.id;
    UPDATE invoices SET workspace_id = workspace_id WHERE user_id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## 🔐 Role-Based Access Control (RBAC)

### Permission Matrix

| Feature | Admin | Manager | Viewer |
|---------|-------|---------|--------|
| View all data | ✅ | ✅ | ✅ |
| Create/Edit projects | ✅ | ✅ | ❌ |
| Create/Edit clients | ✅ | ✅ | ❌ |
| Create/Edit invoices | ✅ | ✅ | ❌ |
| Delete data | ✅ | ❌ | ❌ |
| Manage team members | ✅ | ❌ | ❌ |
| Change workspace settings | ✅ | ❌ | ❌ |
| Access billing | ✅ | ❌ | ❌ |
| Export data | ✅ | ✅ | ❌ |

### RLS Policies

```sql
-- Helper function to get user's role in workspace
CREATE OR REPLACE FUNCTION get_user_role_in_workspace(workspace_id UUID, user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM workspace_members
  WHERE workspace_id = $1 AND user_id = $2 AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Workspace policies
CREATE POLICY "Users can view their workspaces" ON workspaces
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
    )
  );

CREATE POLICY "Admins can update workspace" ON workspaces
  FOR UPDATE USING (
    get_user_role_in_workspace(id, auth.uid()) = 'admin'
  );

-- Project policies (example)
CREATE POLICY "Users can view workspace projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = projects.workspace_id
      AND workspace_members.user_id = auth.uid()
      AND workspace_members.status = 'active'
    )
  );

CREATE POLICY "Admins and managers can create projects" ON projects
  FOR INSERT WITH CHECK (
    get_user_role_in_workspace(workspace_id, auth.uid()) IN ('admin', 'manager')
  );
```

## 📁 Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. **Database Schema**
   - Create workspace tables
   - Add workspace_id to existing tables
   - Create migration scripts
   - Set up RLS policies

2. **Backend API Routes**
   - `/api/workspaces` - CRUD operations
   - `/api/workspaces/[id]/members` - Team management
   - `/api/workspaces/[id]/invite` - Send invitations
   - `/api/workspaces/switch` - Switch active workspace

3. **Authentication Updates**
   - Extend auth context with workspace info
   - Add workspace selection to login flow
   - Handle workspace switching

### Phase 2: UI Implementation (Week 3-4)
1. **Workspace Switcher Component**
   ```tsx
   // components/workspace-switcher.tsx
   export function WorkspaceSwitcher() {
     // Dropdown to switch between workspaces
     // Show current workspace
     // Quick access to workspace settings
   }
   ```

2. **Team Management Page**
   - List team members
   - Invite new members
   - Edit roles and permissions
   - Remove members

3. **Workspace Settings Page**
   - General settings (name, logo)
   - Team management
   - Billing/subscription (linked to existing system)

### Phase 3: Migration & Testing (Week 5)
1. **Data Migration**
   - Run migration script for existing users
   - Create personal workspaces
   - Migrate existing data

2. **Testing**
   - Unit tests for RBAC functions
   - Integration tests for workspace operations
   - E2E tests for user flows

### Phase 4: Polish & Launch (Week 6)
1. **UI/UX Polish**
   - Onboarding flow for new workspaces
   - Email templates for invitations
   - Documentation

2. **Performance Optimization**
   - Query optimization
   - Caching strategies
   - Load testing

## 🔌 Integration Points

### 1. Subscription System
- Link workspace to subscription instead of user
- Update usage tracking to workspace level
- Modify billing portal to show workspace billing

### 2. Existing Features
- Update all queries to filter by workspace_id
- Ensure backward compatibility
- Update data exports to be workspace-scoped

### 3. Real-time Features
- Workspace-scoped real-time subscriptions
- Team activity notifications

## 🚀 Code Implementation Examples

### 1. Updated Auth Provider
```tsx
// components/auth-provider.tsx
interface AuthContextType {
  user: User | null
  workspace: Workspace | null
  workspaces: Workspace[]
  currentRole: 'admin' | 'manager' | 'viewer' | null
  switchWorkspace: (workspaceId: string) => Promise<void>
  // ... existing methods
}
```

### 2. Workspace Hook
```tsx
// hooks/use-workspace.ts
export function useWorkspace() {
  const { workspace, currentRole } = useAuth()
  
  const canEdit = currentRole && ['admin', 'manager'].includes(currentRole)
  const canDelete = currentRole === 'admin'
  const canManageTeam = currentRole === 'admin'
  
  return {
    workspace,
    role: currentRole,
    permissions: {
      canEdit,
      canDelete,
      canManageTeam,
      canAccessBilling: currentRole === 'admin',
    }
  }
}
```

### 3. Protected Components
```tsx
// components/gates/permission-gate.tsx
export function PermissionGate({ 
  children, 
  requires 
}: { 
  children: React.ReactNode
  requires: 'edit' | 'delete' | 'admin'
}) {
  const { permissions } = useWorkspace()
  
  if (!permissions[`can${requires.charAt(0).toUpperCase() + requires.slice(1)}`]) {
    return null
  }
  
  return <>{children}</>
}
```

## 📊 Database Query Updates

### Before (User-based)
```sql
SELECT * FROM projects WHERE user_id = auth.uid()
```

### After (Workspace-based)
```sql
SELECT p.* FROM projects p
JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
WHERE wm.user_id = auth.uid() AND wm.status = 'active'
```

## 🎯 Success Metrics
1. **Technical**
   - Zero downtime migration
   - < 100ms additional latency
   - 100% backward compatibility

2. **Business**
   - Increased user engagement
   - Higher conversion to paid plans
   - Reduced churn through team collaboration

## 🚨 Risk Mitigation
1. **Data Migration Risks**
   - Backup all data before migration
   - Test migration on staging environment
   - Implement rollback procedures

2. **Performance Risks**
   - Add proper indexes
   - Implement caching
   - Monitor query performance

3. **Security Risks**
   - Thorough testing of RLS policies
   - Security audit of permission system
   - Rate limiting on invitation endpoints

## 📝 Next Steps
1. Review and approve the plan
2. Set up development branch
3. Begin Phase 1 implementation
4. Regular progress reviews

This plan provides a solid foundation for implementing workspaces while maintaining the integrity and performance of the existing system.
